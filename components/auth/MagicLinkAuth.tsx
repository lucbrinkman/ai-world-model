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
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${redirectUrl}/auth/callback`,
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
          <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Email sent confirmation */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-2">
              We sent a magic link to
            </p>
            <p className="font-semibold text-white">{email}</p>
          </div>

          {/* Error message if sending failed */}
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded-md text-sm text-center border border-red-700">
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
              className="text-gray-400 hover:text-gray-200"
            >
              Different email
            </button>
            {onSwitchToPassword && (
              <button
                onClick={() => onSwitchToPassword(email)}
                className="text-gray-400 hover:text-gray-200"
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
        <h2 className="text-2xl font-bold text-white">Sign In / Sign Up</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-4">
        {error && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded-md text-sm border border-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="magic-email" className="block text-sm font-medium text-gray-300 mb-1">
            Email
          </label>
          <input
            id="magic-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            placeholder="you@example.com"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Continue'}
        </button>

        <p className="text-xs text-center text-gray-400">
          We&apos;ll email you a magic link for a password-free sign in
        </p>
      </form>

      {onSwitchToPassword && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Have a password?{' '}
          <button
            onClick={() => onSwitchToPassword(email)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign in with password
          </button>
        </div>
      )}
    </div>
  )
}
