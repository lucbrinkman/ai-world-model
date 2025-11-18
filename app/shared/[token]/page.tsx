'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { forkDocument } from '@/lib/actions/documents'
import { saveToLocalStorage } from '@/lib/documentState'
import { useAuth } from '@/hooks/useAuth'

interface SharedPageProps {
  params: Promise<{
    token: string
  }>
}

export default function SharedPage({ params }: SharedPageProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Unwrap params
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token || authLoading) return

    const handleFork = async () => {
      console.log('[Shared] Starting fork for token:', token, 'user:', !!user)
      const result = await forkDocument(token)

      console.log('[Shared] Fork result:', result)

      if (result.error || !result.data) {
        console.error('[Shared] Fork error:', result.error)
        setError('Shared document not found or is no longer available')
        return
      }

      const { document, isOwner } = result.data
      console.log('[Shared] Document:', document.id, 'isOwner:', isOwner, 'has user_id:', !!document.user_id, 'current user:', !!user)

      // If user is the owner, redirect to their original document
      if (isOwner) {
        console.log('[Shared] Owner detected, redirecting to original doc:', document.id)
        router.push(`/?doc=${document.id}`)
        return
      }

      // If current user is authenticated, a copy was created - redirect to it
      if (user) {
        console.log('[Shared] Authenticated user, redirecting to forked doc:', document.id)
        router.push(`/?doc=${document.id}`)
        return
      }

      // For anonymous users, save to localStorage and redirect to home
      console.log('[Shared] Anonymous user, saving to localStorage')
      saveToLocalStorage(document.data, `${document.name} (Copy)`)
      router.push('/')
    }

    handleFork()
  }, [token, user, authLoading, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="text-gray-700 text-lg">Loading shared document...</p>
        </div>
      </div>
    </div>
  )
}
