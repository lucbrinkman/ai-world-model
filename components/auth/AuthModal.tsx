'use client'

import { useState } from 'react'
import { Login } from './Login'
import { Signup } from './Signup'
import { Profile } from './Profile'

type AuthView = 'login' | 'signup' | 'profile'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialView?: AuthView
  isAuthenticated?: boolean
}

export function AuthModal({ isOpen, onClose, initialView = 'login', isAuthenticated = false }: AuthModalProps) {
  const [view, setView] = useState<AuthView>(isAuthenticated ? 'profile' : initialView)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'login' && (
          <Login
            onClose={onClose}
            onSwitchToSignup={() => setView('signup')}
          />
        )}
        {view === 'signup' && (
          <Signup
            onClose={onClose}
            onSwitchToLogin={() => setView('login')}
          />
        )}
        {view === 'profile' && (
          <Profile onClose={onClose} />
        )}
      </div>
    </div>
  )
}
