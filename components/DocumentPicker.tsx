'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document } from '@/lib/types';
import { getUserDocuments, deleteDocument, renameDocument } from '@/lib/actions/documents';
import TemplateChoiceDialog from './TemplateChoiceDialog';
import NewDocumentWarningDialog from './NewDocumentWarningDialog';
import { ShareModal } from './ShareModal';

interface DocumentPickerProps {
  currentDocumentId: string | null;
  currentDocumentName: string;
  isAuthenticated: boolean;
  onDocumentSelect: (documentId: string) => void;
  onCreateNew: (useTemplate: boolean) => void;
  onRename: (newName: string) => void;
  onEditorClose?: () => void;
}

export default function DocumentPicker({
  currentDocumentId,
  currentDocumentName,
  isAuthenticated,
  onDocumentSelect,
  onCreateNew,
  onRename,
  onEditorClose,
}: DocumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(currentDocumentName);
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const justRenamed = useRef(false);

  // Load documents when dropdown opens or when renaming starts
  useEffect(() => {
    if ((isOpen || isRenaming) && isAuthenticated) {
      loadDocuments();
    }
  }, [isOpen, isRenaming, isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming) {
      // Clear hover state and tooltip when entering rename mode
      setIsHovering(false);
      setShowTooltip(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }
  }, [isRenaming]);

  // Update rename value when document name changes
  useEffect(() => {
    setRenameValue(currentDocumentName);
  }, [currentDocumentName]);

  // Handle hover timeout for tooltip
  const handleMouseEnter = () => {
    // Don't activate hover if we just renamed (cooldown period)
    if (justRenamed.current) return;

    setIsHovering(true);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 350); // Show tooltip after 0.35 seconds
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setShowTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await getUserDocuments();
    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  const handleDelete = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    const { error } = await deleteDocument(documentId);
    if (!error) {
      // Reload documents list
      await loadDocuments();

      // If we deleted the current document, create a new one
      if (documentId === currentDocumentId) {
        onCreateNew();
      }
    }
  };

  // Check for duplicate names in real-time
  useEffect(() => {
    if (!isRenaming || !isAuthenticated) {
      setRenameError(null);
      return;
    }

    const trimmedValue = renameValue.trim();

    // Skip validation if unchanged or empty
    if (!trimmedValue || trimmedValue === currentDocumentName) {
      setRenameError(null);
      return;
    }

    // Check if name exists in loaded documents
    const nameExists = documents.some(
      doc => doc.name === trimmedValue && doc.id !== currentDocumentId
    );

    if (nameExists) {
      setRenameError('A document with this name already exists');
    } else {
      setRenameError(null);
    }
  }, [renameValue, isRenaming, isAuthenticated, documents, currentDocumentName, currentDocumentId]);

  const handleRenameSubmit = useCallback(async () => {
    const trimmedValue = renameValue.trim();

    if (!trimmedValue) {
      setRenameValue(currentDocumentName);
      setIsRenaming(false);
      setIsHovering(false);
      setShowTooltip(false);
      setRenameError(null);
      onEditorClose?.();
      return;
    }

    // Don't submit if there's an error
    if (renameError) {
      return;
    }

    if (trimmedValue !== currentDocumentName) {
      if (isAuthenticated && currentDocumentId) {
        const result = await renameDocument(currentDocumentId, trimmedValue);
        if (result.error) {
          // Show error and keep rename mode active
          setRenameError(result.error);
          return;
        }
      }
      onRename(trimmedValue);
    }

    setIsRenaming(false);
    setIsOpen(false);
    setIsHovering(false);
    setShowTooltip(false);
    setRenameError(null);
    onEditorClose?.();

    // Set cooldown period to prevent hover from immediately reactivating
    justRenamed.current = true;
    setTimeout(() => {
      justRenamed.current = false;
    }, 300); // 300ms cooldown
  }, [renameValue, currentDocumentName, isAuthenticated, currentDocumentId, onRename, renameError, onEditorClose]);

  // Handle clicks outside when renaming to submit
  useEffect(() => {
    if (!isRenaming) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (renameInputRef.current && !renameInputRef.current.contains(event.target as Node)) {
        // Call onEditorClose FIRST to set the timestamp before any other handlers run
        onEditorClose?.();

        // If there's an error, reset the value instead of trying to submit again
        if (renameError) {
          setRenameValue(currentDocumentName);
          setRenameError(null);
          setIsRenaming(false);
        } else {
          handleRenameSubmit();
        }
      }
    };

    // Use capture phase to ensure we catch the click before it's potentially stopped
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isRenaming, renameError, currentDocumentName, handleRenameSubmit]);

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameValue(currentDocumentName);
      setRenameError(null);
      setIsRenaming(false);
      onEditorClose?.();
    }
  };

  // For anonymous users, show dropdown with create new option
  if (!isAuthenticated) {
    if (isRenaming) {
      return (
        <div className="flex items-center gap-2">
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            style={{ width: '200px' }}
          />
        </div>
      );
    }

    return (
      <>
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm">
            <div className="relative inline-block">
              <span
                className={`font-medium cursor-text px-1 py-0.5 rounded transition-all ${
                  isHovering ? 'border border-gray-500' : 'border border-transparent'
                }`}
                onClick={() => setIsRenaming(true)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {renameValue}
              </span>
              {showTooltip && (
                <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                  Rename
                </div>
              )}
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="hover:bg-gray-700 p-1 rounded"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-50">
              {/* Create New button */}
              <button
                onClick={() => {
                  setShowWarningDialog(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 border-b border-gray-600 font-medium"
              >
                + Create New Document
              </button>

              {/* Rename Current button */}
              <button
                onClick={() => {
                  setIsRenaming(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
              >
                Rename Current
              </button>
            </div>
          )}
        </div>

        {/* Warning Dialog */}
        <NewDocumentWarningDialog
          isOpen={showWarningDialog}
          onConfirm={() => {
            setShowWarningDialog(false);
            setShowTemplateDialog(true);
          }}
          onCancel={() => setShowWarningDialog(false)}
        />

        {/* Template Choice Dialog */}
        <TemplateChoiceDialog
          isOpen={showTemplateDialog}
          onChooseTemplate={() => {
            onCreateNew(true);
            setShowTemplateDialog(false);
          }}
          onChooseEmpty={() => {
            onCreateNew(false);
            setShowTemplateDialog(false);
          }}
          onCancel={() => setShowTemplateDialog(false)}
        />
      </>
    );
  }

  // For authenticated users, show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      {isRenaming ? (
        <div className="flex flex-col gap-1">
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
            }}
            onKeyDown={handleRenameKeyDown}
            className={`px-3 py-2 bg-gray-800 border rounded text-white text-sm ${
              renameError ? 'border-red-500' : 'border-gray-600'
            }`}
            style={{ width: '250px' }}
          />
          {renameError && (
            <div className="text-xs text-red-400">{renameError}</div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm">
          <div className="relative inline-block">
            <span
              className={`font-medium cursor-text px-1 py-0.5 rounded transition-all ${
                isHovering ? 'border border-gray-500' : 'border border-transparent'
              }`}
              onClick={() => setIsRenaming(true)}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {renameValue}
            </span>
            {showTooltip && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                Rename
              </div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hover:bg-gray-700 p-1 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Create New button */}
          <button
            onClick={() => {
              setShowTemplateDialog(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 border-b border-gray-600 font-medium"
          >
            + Create New Document
          </button>

          {/* Rename Current button */}
          <button
            onClick={() => {
              setIsRenaming(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 border-b border-gray-600"
          >
            Rename Current
          </button>

          {/* Share Current button */}
          <button
            onClick={() => {
              if (currentDocumentId) {
                setIsShareModalOpen(true);
                setIsOpen(false);
              }
            }}
            disabled={!currentDocumentId}
            className={`w-full px-4 py-2 text-left text-sm border-b border-gray-600 ${
              currentDocumentId
                ? 'text-white hover:bg-gray-700 cursor-pointer'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title={!currentDocumentId ? 'Save document first to enable sharing' : ''}
          >
            Share Current
          </button>

          {/* Documents list */}
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">No documents yet</div>
          ) : (
            <div className="py-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-700 ${
                    doc.id === currentDocumentId ? 'bg-gray-700' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      onDocumentSelect(doc.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left text-white truncate"
                  >
                    {doc.name}
                  </button>
                  {doc.id !== currentDocumentId && (
                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Choice Dialog */}
      <TemplateChoiceDialog
        isOpen={showTemplateDialog}
        onChooseTemplate={() => {
          onCreateNew(true);
          setShowTemplateDialog(false);
        }}
        onChooseEmpty={() => {
          onCreateNew(false);
          setShowTemplateDialog(false);
        }}
        onCancel={() => setShowTemplateDialog(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={currentDocumentId}
        initialIsPublic={false}
      />
    </div>
  );
}
