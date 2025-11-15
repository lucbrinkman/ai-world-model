'use client'

import { useState } from 'react'
import { createPassword } from '@/lib/actions/password'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
}

export function WelcomeModal({ isOpen, onClose, userEmail }: WelcomeModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mouseDownOutside, setMouseDownOutside] = useState(false)

  if (!isOpen) return null

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const result = await createPassword(password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Success - close the modal
      onClose()
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const handleBackdropMouseDown = () => {
    setMouseDownOutside(true)
  }

  const handleBackdropMouseUp = () => {
    if (mouseDownOutside) {
      onClose()
    }
    setMouseDownOutside(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Welcome Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
          </div>

          {/* Password Creation Option */}
          {!showPasswordForm ? (
            <div className="space-y-3">
              <button
                onClick={handleSkip}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 font-medium"
              >
                Done
              </button>

              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full text-gray-600 hover:text-gray-800 text-sm py-2"
              >
                Create optional password
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreatePassword} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Create Your Password
                </h3>
                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-3">
                    {error}
                  </div>
                )}
                <div className="space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min. 6 characters)"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
