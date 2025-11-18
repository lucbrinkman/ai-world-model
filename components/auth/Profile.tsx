'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { exportUserData, deleteUserAccount } from '@/lib/actions/account'
import { createPassword } from '@/lib/actions/password'
import Link from 'next/link'

interface ProfileProps {
  onClose: () => void
}

export function Profile({ onClose }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPasswordCreate, setShowPasswordCreate] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    window.location.reload()
  }

  const handleExportData = async () => {
    setExporting(true)
    const result = await exportUserData()

    if (result.error) {
      alert(result.error)
    } else if (result.data) {
      // Download as JSON file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-futures-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    setExporting(false)
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This will permanently delete all your saved scenarios and cannot be undone.'
    )

    if (!confirmed) return

    const doubleConfirm = confirm(
      'This is your last chance. Are you absolutely sure you want to delete your account?'
    )

    if (!doubleConfirm) return

    setDeleting(true)
    const result = await deleteUserAccount()

    if (result.error) {
      alert(result.error)
      setDeleting(false)
    } else {
      // Account deleted, redirect to home
      window.location.href = '/'
    }
  }

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    const result = await createPassword(password)

    if (result.error) {
      setPasswordError(result.error)
      setPasswordLoading(false)
    } else {
      setPasswordSuccess(true)
      setPasswordLoading(false)
      setTimeout(() => {
        setShowPasswordCreate(false)
        setPassword('')
        setConfirmPassword('')
        setPasswordSuccess(false)
      }, 2000)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Not signed in</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-700 p-4 rounded-md">
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <p className="text-white">{user.email}</p>
        </div>

        <div className="bg-gray-700 p-4 rounded-md">
          <label className="block text-sm font-medium text-gray-300 mb-1">User ID</label>
          <p className="text-gray-400 text-sm font-mono break-all">{user.id}</p>
        </div>

        {/* Create Password Section */}
        {!showPasswordCreate ? (
          <div className="pt-4 pb-4 border-b border-gray-700">
            <button
              onClick={() => setShowPasswordCreate(true)}
              className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-200 font-medium transition-colors"
            >
              + Create an optional password
            </button>
            <p className="text-xs text-gray-400 mt-2 px-1">
              Add a password to sign in faster (you can still use magic links)
            </p>
          </div>
        ) : (
          <div className="pt-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white mb-3">Create Password</h3>
            {passwordSuccess && (
              <div className="bg-green-900/50 text-green-200 p-3 rounded-md text-sm mb-3 border border-green-700">
                Password created successfully!
              </div>
            )}
            <form onSubmit={handleCreatePassword} className="space-y-3">
              {passwordError && (
                <div className="bg-red-900/50 text-red-200 p-3 rounded-md text-sm border border-red-700">
                  {passwordError}
                </div>
              )}
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordCreate(false)
                    setPassword('')
                    setConfirmPassword('')
                    setPasswordError(null)
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {passwordLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="pt-4 space-y-2">
          <Link
            href="/privacy"
            target="_blank"
            className="block text-center text-sm text-blue-400 hover:text-blue-300 mb-2"
          >
            Privacy Policy
          </Link>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Download My Data'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
