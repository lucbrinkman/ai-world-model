'use server'

import { createClient } from '@/lib/supabase/server'

export async function createPassword(password: string) {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to create a password' }
  }

  // Update user password
  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Error creating password:', error)
    return { error: error.message || 'Failed to create password' }
  }

  return { error: null }
}

export async function hasPassword(): Promise<{ hasPassword: boolean; error: string | null }> {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { hasPassword: false, error: 'You must be logged in' }
  }

  // Check user metadata to see if they have a password
  // Users who signed up with magic link won't have a password initially
  // Unfortunately Supabase doesn't have a direct way to check this
  // We can infer from the auth providers used
  const hasPasswordProvider = user.app_metadata?.providers?.includes('email') || false

  return { hasPassword: hasPasswordProvider, error: null }
}
