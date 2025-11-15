'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MagicLinkAuthProps {
  onClose: () => void
  onSwitchToPassword?: (email: string) => void
}

export function MagicLinkAuth({ onClose, onSwitchToPassword }: MagicLinkAuthProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Optimistically show success immediately
    setSuccess(true)

    // Send email in background
    const supabase = createClient()
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    }).then(({ error }) => {
      if (error) {
        // Show error after a delay if sending failed
        setTimeout(() => {
          setError(error.message || 'Failed to send magic link. Please try again.')
          setSuccess(false)
        }, 2000)
      }
    })
  }

  if (success) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Email sent confirmation */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">
              We sent a magic link to
            </p>
            <p className="font-semibold text-gray-900">{email}</p>
          </div>

          {/* Error message if sending failed */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <button
              onClick={() => {
                setSuccess(false)
                setEmail('')
                setError(null)
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Different email
            </button>
            {onSwitchToPassword && (
              <button
                onClick={() => onSwitchToPassword(email)}
                className="text-gray-600 hover:text-gray-900"
              >
                Use password
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="magic-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="you@example.com"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Continue'}
        </button>

        <p className="text-xs text-center text-gray-500">
          We&apos;ll email you a magic link for a password-free sign in
        </p>
      </form>

      {onSwitchToPassword && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Have a password?{' '}
          <button
            onClick={() => onSwitchToPassword(email)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Sign in with password
          </button>
        </div>
      )}
    </div>
  )
}
