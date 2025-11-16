'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { posthog } from '@/lib/analytics'

const CONSENT_KEY = 'cookie-consent'

interface CookieSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function CookieSettings({ isOpen, onClose }: CookieSettingsProps) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    // Load current consent status
    const consent = localStorage.getItem(CONSENT_KEY)
    setAnalyticsEnabled(consent === 'accepted')
  }, [isOpen])

  const handleToggle = (enabled: boolean) => {
    setAnalyticsEnabled(enabled)

    if (enabled) {
      localStorage.setItem(CONSENT_KEY, 'accepted')
      posthog.opt_in_capturing()
    } else {
      localStorage.setItem(CONSENT_KEY, 'declined')
      posthog.opt_out_capturing()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cookie Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Essential Cookies */}
          <div className="pb-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Essential Cookies</h3>
              <span className="text-sm text-gray-400">Always Active</span>
            </div>
            <p className="text-sm text-gray-300">
              Required for login and core functionality. These cannot be disabled.
            </p>
          </div>

          {/* Analytics Cookies */}
          <div className="pb-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Analytics Cookies</h3>
              <button
                onClick={() => handleToggle(!analyticsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  analyticsEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    analyticsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-300">
              Help us understand how users interact with the app to improve the experience.
              No marketing, no tracking, no data selling.
            </p>
          </div>

          {/* Privacy Policy Link */}
          <div className="pt-2">
            <Link
              href="/privacy"
              className="text-sm text-blue-400 hover:text-blue-300 underline"
              onClick={onClose}
            >
              View full privacy policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
