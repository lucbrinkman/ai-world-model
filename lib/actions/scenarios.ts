'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SavedScenario {
  id: string
  user_id: string
  name: string
  slider_values: number[]
  created_at: string
  updated_at: string
  is_public: boolean
}

export async function saveScenario(name: string, sliderValues: number[]) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to save scenarios' }
  }

  // Save scenario
  const { data, error } = await supabase
    .from('saved_scenarios')
    .insert({
      user_id: user.id,
      name,
      slider_values: sliderValues,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving scenario:', error)
    return { error: 'Failed to save scenario' }
  }

  revalidatePath('/')
  return { data, error: null }
}

export async function getUserScenarios(): Promise<{
  data: SavedScenario[] | null
  error: string | null
}> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'You must be logged in to view scenarios' }
  }

  // Get user's scenarios
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching scenarios:', error)
    return { data: null, error: 'Failed to fetch scenarios' }
  }

  return { data, error: null }
}

export async function deleteScenario(scenarioId: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete scenarios' }
  }

  // Delete scenario (RLS will ensure they can only delete their own)
  const { error } = await supabase
    .from('saved_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting scenario:', error)
    return { error: 'Failed to delete scenario' }
  }

  revalidatePath('/')
  return { error: null }
}

export async function updateScenario(
  scenarioId: string,
  name: string,
  sliderValues: number[]
) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to update scenarios' }
  }

  // Update scenario (RLS will ensure they can only update their own)
  const { data, error } = await supabase
    .from('saved_scenarios')
    .update({
      name,
      slider_values: sliderValues,
    })
    .eq('id', scenarioId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating scenario:', error)
    return { error: 'Failed to update scenario' }
  }

  revalidatePath('/')
  return { data, error: null }
}
