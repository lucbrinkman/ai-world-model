'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/auth/AuthModal';
import { CookieSettings } from '@/components/CookieSettings';

export default function SettingsMenu() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      {/* Settings Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">
            <div className="py-2">
              {/* Profile Section */}
              {loading ? (
                <div className="px-4 py-3 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                </div>
              ) : user ? (
                <div className="px-4 py-2 border-b border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Signed in as</div>
                  <div className="text-sm text-gray-200 truncate mb-2">{user.email}</div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded transition-colors text-left"
                  >
                    Manage Profile
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2 border-b border-gray-700">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                  >
                    Sign In / Sign Up
                  </button>
                </div>
              )}

              {/* Cookie Settings */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setCookieSettingsOpen(true);
                }}
                className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors text-left"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isAuthenticated={!!user}
      />

      {/* Cookie Settings Modal */}
      <CookieSettings
        isOpen={cookieSettingsOpen}
        onClose={() => setCookieSettingsOpen(false)}
      />
    </>
  );
}
