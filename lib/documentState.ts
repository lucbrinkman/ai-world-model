import { DocumentData, GraphNode, GraphMetadata } from './types';

const STORAGE_KEY = 'ai_futures_draft_document';
const NAME_KEY = 'ai_futures_draft_name';

/**
 * Save document data to localStorage (for anonymous users)
 */
export function saveToLocalStorage(data: DocumentData, name?: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (name) {
      localStorage.setItem(NAME_KEY, name);
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Load document data from localStorage (for anonymous users)
 * Migrates old data format to ensure all nodes have the probability field
 */
export function loadFromLocalStorage(): { data: DocumentData; name: string | null } | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as DocumentData;
    const name = localStorage.getItem(NAME_KEY);

    // Migrate old data: ensure all nodes have probability field
    const migratedNodes = data.nodes.map(node => {
      // If node doesn't have probability field, add it
      if (node.probability === undefined) {
        return {
          ...node,
          probability: node.type === 'n' ? 50 : null // Default to 50 for question nodes, null for others
        };
      }
      return node;
    });

    return {
      data: {
        ...data,
        nodes: migratedNodes
      },
      name: name || null
    };
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
    localStorage.removeItem(NAME_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Create a default document data structure
 */
export function createDefaultDocumentData(
  nodes: GraphNode[],
  metadata: GraphMetadata
): DocumentData {
  return {
    nodes,
    metadata,
  };
}
