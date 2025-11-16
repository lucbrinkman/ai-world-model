'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { GraphData } from '@/lib/types'

export interface UserGraph {
  id: string
  user_id: string
  name: string
  graph_data: GraphData
  created_at: string
  updated_at: string
  is_public: boolean
  is_default: boolean
}

export async function saveGraph(name: string, graphData: GraphData, isDefault: boolean = false) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to save graphs' }
  }

  // If setting as default, unset any existing default first
  if (isDefault) {
    await supabase
      .from('user_graphs')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
  }

  // Save graph
  const { data, error } = await supabase
    .from('user_graphs')
    .insert({
      user_id: user.id,
      name,
      graph_data: graphData,
      is_default: isDefault,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving graph:', error)
    return { error: 'Failed to save graph' }
  }

  revalidatePath('/')
  return { data, error: null }
}

export async function getUserGraphs(): Promise<{
  data: UserGraph[] | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to view graphs' }
  }

  // Get user's graphs
  const { data, error } = await supabase
    .from('user_graphs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching graphs:', error)
    return { data: null, error: 'Failed to fetch graphs' }
  }

  return { data, error: null }
}

export async function getDefaultGraph(): Promise<{
  data: UserGraph | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  // Get user's default graph
  const { data, error } = await supabase
    .from('user_graphs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching default graph:', error)
    return { data: null, error: 'Failed to fetch default graph' }
  }

  return { data: data || null, error: null }
}

export async function loadGraph(graphId: string): Promise<{
  data: UserGraph | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to load graphs' }
  }

  // Load specific graph (RLS will ensure they can only load their own or public graphs)
  const { data, error } = await supabase
    .from('user_graphs')
    .select('*')
    .eq('id', graphId)
    .single()

  if (error) {
    console.error('Error loading graph:', error)
    return { data: null, error: 'Failed to load graph' }
  }

  return { data, error: null }
}

export async function updateGraph(
  graphId: string,
  name: string,
  graphData: GraphData,
  isDefault?: boolean
) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to update graphs' }
  }

  // If setting as default, unset any existing default first
  if (isDefault) {
    await supabase
      .from('user_graphs')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
      .neq('id', graphId) // Don't unset the one we're about to update
  }

  // Update graph (RLS will ensure they can only update their own)
  const updateData: Record<string, unknown> = {
    name,
    graph_data: graphData,
  }

  if (isDefault !== undefined) {
    updateData.is_default = isDefault
  }

  const { data, error } = await supabase
    .from('user_graphs')
    .update(updateData)
    .eq('id', graphId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating graph:', error)
    return { error: 'Failed to update graph' }
  }

  revalidatePath('/')
  return { data, error: null }
}

export async function deleteGraph(graphId: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete graphs' }
  }

  // Delete graph (RLS will ensure they can only delete their own)
  const { error } = await supabase
    .from('user_graphs')
    .delete()
    .eq('id', graphId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting graph:', error)
    return { error: 'Failed to delete graph' }
  }

  revalidatePath('/')
  return { error: null }
}

export async function setDefaultGraph(graphId: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to set default graph' }
  }

  // Unset all defaults first
  await supabase
    .from('user_graphs')
    .update({ is_default: false })
    .eq('user_id', user.id)
    .eq('is_default', true)

  // Set the new default
  const { error } = await supabase
    .from('user_graphs')
    .update({ is_default: true })
    .eq('id', graphId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error setting default graph:', error)
    return { error: 'Failed to set default graph' }
  }

  revalidatePath('/')
  return { error: null }
}
