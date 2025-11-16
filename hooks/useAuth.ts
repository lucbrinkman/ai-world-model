'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { hasDraftInLocalStorage, loadFromLocalStorage, clearLocalStorage } from '@/lib/documentState'
import { createDocument } from '@/lib/actions/documents'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let previousUser: User | null = null

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      previousUser = user
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      const wasAnonymous = !previousUser
      const isNowAuthenticated = !!newUser

      previousUser = newUser
      setUser(newUser)
      setLoading(false)

      // Auto-migrate localStorage draft when user signs in/up (not on page refresh)
      if (wasAnonymous && isNowAuthenticated && event === 'SIGNED_IN') {
        if (hasDraftInLocalStorage()) {
          const draft = loadFromLocalStorage()
          if (draft) {
            // Create document from localStorage draft with auto-generated name
            const result = await createDocument(null, draft)
            if (!result.error) {
              // Clear localStorage after successful migration
              clearLocalStorage()
              console.log('Successfully migrated localStorage draft to cloud')
            }
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
