import { DocumentData, GraphNode, GraphMetadata } from './types';

const STORAGE_KEY = 'ai_futures_draft_document';

/**
 * Save document data to localStorage (for anonymous users)
 */
export function saveToLocalStorage(data: DocumentData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Load document data from localStorage (for anonymous users)
 */
export function loadFromLocalStorage(): DocumentData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as DocumentData;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Check if there's a draft in localStorage
 */
export function hasDraftInLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Clear the draft from localStorage (called after migration to cloud)
 */
export function clearLocalStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Create a default document data structure
 */
export function createDefaultDocumentData(
  nodes: GraphNode[],
  sliderValues: number[],
  metadata: GraphMetadata
): DocumentData {
  return {
    nodes,
    sliderValues,
    metadata,
  };
}
