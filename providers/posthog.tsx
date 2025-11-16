'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

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
      // Check if CookieYes has given consent for analytics
      // CookieYes sets this global variable when consent is managed
      const checkConsent = () => {
        // @ts-ignore - CookieYes global
        if (typeof window.CookieConsent !== 'undefined') {
          // @ts-ignore - CookieYes global
          const consentCategories = window.CookieConsent.getCategories()
          // If analytics category is not accepted, opt out
          if (!consentCategories.includes('analytics')) {
            posthog.opt_out_capturing()
            return false
          }
        }
        return true
      }

      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        autocapture: false, // We'll manually track events
        loaded: (posthog) => {
          // Check consent after PostHog loads
          checkConsent()

          if (process.env.NODE_ENV === 'development') {
            posthog.debug()
          }
        },
      })

      // Listen for CookieYes consent changes
      // @ts-ignore - CookieYes event
      document.addEventListener('cookieyes_consent_update', () => {
        if (checkConsent()) {
          posthog.opt_in_capturing()
        } else {
          posthog.opt_out_capturing()
        }
      })
    }
  }, [])

  return (
    <>
      <PostHogPageView />
      {children}
    </>
  )
}
