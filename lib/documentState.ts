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
 * Migrates old data format to ensure all nodes have the probability field
 */
export function loadFromLocalStorage(): DocumentData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as DocumentData;

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
      ...data,
      nodes: migratedNodes
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

/**
 * Create an empty document with just a start node
 */
export function createEmptyDocumentData(): DocumentData {
  const startNode: GraphNode = {
    id: 'sstart',
    type: 's',
    title: 'START',
    description: '',
    position: {
      x: 150,
      y: 120,
    },
    sliderIndex: null,
    probability: null,
    connections: [
      {
        targetX: 250, // Free-floating connection pointing to the right
        targetY: 120,
        type: '-',
        label: '',
      },
    ],
  };

  const metadata: GraphMetadata = {
    version: '1.0',
    title: 'Map of AI Futures',
    canvas: {
      width: 1400,
      height: 1800,
    },
  };

  return {
    nodes: [startNode],
    metadata,
  };
}
