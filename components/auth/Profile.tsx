'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { exportUserData, deleteUserAccount } from '@/lib/actions/account'
import Link from 'next/link'

interface ProfileProps {
  onClose: () => void
}

export function Profile({ onClose }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Not signed in</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="text-gray-900">{user.email}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <p className="text-gray-600 text-sm font-mono break-all">{user.id}</p>
        </div>

        <div className="pt-4 space-y-2">
          <Link
            href="/privacy"
            target="_blank"
            className="block text-center text-sm text-purple-600 hover:text-purple-700 mb-2"
          >
            Privacy Policy
          </Link>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
