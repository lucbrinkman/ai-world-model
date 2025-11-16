import { useEffect, useRef, useState, useCallback } from 'react';
import { DocumentData } from './types';
import { saveToLocalStorage } from './documentState';
import { saveDocument } from './actions/documents';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  documentId: string | null; // null for new/unsaved documents
  documentName: string;
  data: DocumentData;
  isAuthenticated: boolean;
  authLoading: boolean; // Don't save while auth is loading
  debounceMs?: number; // Default 2000ms
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => Promise<void>; // Manual save trigger
  error: string | null;
  lastSavedAt: Date | null; // Timestamp of last successful save
}

/**
 * Auto-save hook that handles both authenticated (cloud) and anonymous (localStorage) users
 *
 * For authenticated users:
 * - Debounces saves to the cloud
 * - Shows save status (saving/saved/error)
 *
 * For anonymous users:
 * - Saves immediately to localStorage
 * - Always shows "saved locally"
 */
export function useAutoSave({
  documentId,
  documentName,
  data,
  isAuthenticated,
  authLoading,
  debounceMs = 2000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef<DocumentData>(data);
  const isMountedRef = useRef(true);

  // Update data ref whenever data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (!isMountedRef.current) return;

    const currentData = dataRef.current;

    // For anonymous users, save to localStorage
    if (!isAuthenticated) {
      saveToLocalStorage(currentData);
      setSaveStatus('saved');
      setError(null);
      setLastSavedAt(new Date());
      return;
    }

    // For authenticated users, save to cloud
    setSaveStatus('saving');
    setError(null);

    try {
      await saveDocument(documentId, documentName, currentData);

      if (isMountedRef.current) {
        setSaveStatus('saved');
        setError(null);
        setLastSavedAt(new Date());

        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSaveStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    }
  }, [documentId, documentName, isAuthenticated]);

  // Manual save trigger
  const triggerSave = useCallback(async () => {
    // Cancel any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await performSave();
  }, [performSave]);

  // Auto-save effect (debounced)
  useEffect(() => {
    // Don't save while auth is loading
    if (authLoading) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // For anonymous users, save immediately to localStorage
    if (!isAuthenticated) {
      saveToLocalStorage(data);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      return;
    }

    // For authenticated users, debounce the save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, isAuthenticated, authLoading, debounceMs, performSave]);

  return {
    saveStatus,
    triggerSave,
    error,
    lastSavedAt,
  };
}
