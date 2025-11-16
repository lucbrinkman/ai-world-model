'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { detectUserCountry, requiresCookieConsent } from '@/lib/geolocation'
import { posthog } from '@/lib/analytics'

const CONSENT_KEY = 'cookie-consent'

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkConsent() {
      // Check if user has already made a choice
      const existingConsent = localStorage.getItem(CONSENT_KEY)
      if (existingConsent) {
        setIsLoading(false)
        return
      }

      // Detect user's country
      const country = await detectUserCountry()
      const needsConsent = requiresCookieConsent(country)

      if (needsConsent) {
        // Show banner for GDPR regions
        setShowBanner(true)
      } else {
        // Auto-consent for non-GDPR regions
        localStorage.setItem(CONSENT_KEY, 'accepted')
        // Immediately opt-in PostHog for this session
        posthog.opt_in_capturing()
      }

      setIsLoading(false)
    }

    checkConsent()
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setShowBanner(false)
    // Explicitly opt in to PostHog
    posthog.opt_in_capturing()
  }

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setShowBanner(false)
    // Opt out of PostHog tracking
    posthog.opt_out_capturing()
  }

  if (isLoading || !showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-300">
            We care about AI Safety. We use analytics cookies to understand how to improve this AI Safety tool.{' '}
            <strong>No marketing, no data selling.</strong>{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {/* Equal blue buttons - GDPR compliant (no dark patterns) */}
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Decline Analytics
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </div>
  )
}
