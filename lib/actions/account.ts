'use server'

import { createClient } from '@/lib/supabase/server'

export async function exportUserData() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to export data' }
  }

  // Get user's scenarios
  const { data: scenarios, error: scenariosError } = await supabase
    .from('saved_scenarios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (scenariosError) {
    console.error('Error fetching scenarios:', scenariosError)
    return { error: 'Failed to fetch scenarios' }
  }

  // Compile user data
  const userData = {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    scenarios: scenarios,
    exported_at: new Date().toISOString(),
  }

  return { data: userData, error: null }
}

export async function deleteUserAccount() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete your account' }
  }

  // Delete all user scenarios (will cascade delete due to foreign key)
  const { error: scenariosError } = await supabase
    .from('saved_scenarios')
    .delete()
    .eq('user_id', user.id)

  if (scenariosError) {
    console.error('Error deleting scenarios:', scenariosError)
    return { error: 'Failed to delete scenarios' }
  }

  // Delete user from auth (this will also handle cleanup)
  // Note: Supabase's admin API is needed for complete user deletion
  // For now, we'll sign them out and delete their data
  const { error: signOutError } = await supabase.auth.signOut()

  if (signOutError) {
    console.error('Error signing out:', signOutError)
    return { error: 'Failed to sign out' }
  }

  // Note: To fully delete the user from auth.users, you would need to use
  // the Supabase Admin API (supabase.auth.admin.deleteUser(user.id))
  // This requires a service role key which should only be used server-side

  return { error: null }
}
