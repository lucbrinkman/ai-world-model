'use client'

import { useState, useEffect } from 'react'
import { toggleDocumentSharing } from '@/lib/actions/documents'
import { loadDocument } from '@/lib/actions/documents'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string | null
  initialIsPublic: boolean
}

export function ShareModal({ isOpen, onClose, documentId, initialIsPublic }: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mouseDownOutside, setMouseDownOutside] = useState(false)

  // Fetch document sharing state when modal opens
  useEffect(() => {
    if (!isOpen || !documentId) return

    const fetchSharingState = async () => {
      const result = await loadDocument(documentId)
      if (!result.error && result.data) {
        setIsPublic(result.data.is_public)
        setShareToken(result.data.is_public ? result.data.share_token : null)
      }
    }

    fetchSharingState()
  }, [isOpen, documentId])

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

  const handleToggleSharing = async () => {
    if (!documentId) {
      setError('No document selected')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await toggleDocumentSharing(documentId)

    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data) {
      setIsPublic(result.data.is_public)
      setShareToken(result.data.share_token)
      setCopied(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareToken) return

    const shareUrl = `${window.location.origin}/shared/${shareToken}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setError('Failed to copy link to clipboard')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Share Document</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={handleToggleSharing}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {isPublic ? 'Sharing enabled' : 'Sharing disabled'}
            </span>
          </label>
          <p className="mt-2 text-xs text-gray-500">
            {isPublic
              ? 'Anyone with the link can create their own copy'
              : 'Enable sharing to generate a shareable link'}
          </p>
        </div>

        {isPublic && shareToken && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/shared/${shareToken}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 text-gray-900"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
