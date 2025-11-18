'use client'

import { useState, useEffect } from 'react'
import { MagicLinkAuth } from './MagicLinkAuth'
import { Login } from './Login'
import { Profile } from './Profile'

type AuthView = 'magic' | 'password' | 'profile'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialView?: AuthView
  isAuthenticated?: boolean
}

export function AuthModal({ isOpen, onClose, initialView = 'magic', isAuthenticated = false }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(isAuthenticated ? 'profile' : initialView)
  const [emailForward, setEmailForward] = useState<string>('')
  const [mouseDownOutside, setMouseDownOutside] = useState(false)

  // Update view when authentication status changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setView(isAuthenticated ? 'profile' : initialView)
      setEmailForward('') // Reset email forward when opening
    }
  }, [isOpen, isAuthenticated, initialView])

  if (!isOpen) return null

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
        className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {view === 'magic' && (
          <MagicLinkAuth
            onClose={onClose}
            onSwitchToPassword={(email) => {
              setEmailForward(email)
              setView('password')
            }}
          />
        )}
        {view === 'password' && (
          <Login
            onClose={onClose}
            onSwitchToMagicLink={() => setView('magic')}
            initialEmail={emailForward}
          />
        )}
        {view === 'profile' && (
          <Profile onClose={onClose} />
        )}
      </div>
    </div>
  )
}
