'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const CONSENT_KEY = 'cookie-consent'

function PostHogPageView() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

    if (posthogKey && posthogHost && typeof window !== 'undefined') {
      // Check localStorage for user's consent choice
      const consent = localStorage.getItem(CONSENT_KEY)

      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        autocapture: false, // We'll manually track events
        loaded: (posthog) => {
          // Respect user's consent choice
          if (consent === 'declined') {
            // User explicitly declined analytics - opt out
            posthog.opt_out_capturing()
          } else if (consent === 'accepted') {
            // User explicitly accepted analytics - opt in
            posthog.opt_in_capturing()
          }
          // If no consent recorded yet, PostHog will use default behavior
          // (auto-consent for non-GDPR regions, wait for GDPR regions)

          if (process.env.NODE_ENV === 'development') {
            posthog.debug()
          }
        },
      })

      // Listen for consent changes from localStorage
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === CONSENT_KEY) {
          if (e.newValue === 'declined') {
            posthog.opt_out_capturing()
          } else if (e.newValue === 'accepted') {
            posthog.opt_in_capturing()
          }
        }
      }

      window.addEventListener('storage', handleStorageChange)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  return (
    <>
      <PostHogPageView />
      {children}
    </>
  )
}
