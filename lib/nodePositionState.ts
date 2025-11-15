// localStorage persistence for custom node positions

const STORAGE_KEY = 'customNodePositions';

export interface CustomNodePosition {
  x: number;
  y: number;
}

export type CustomNodePositions = Record<string, CustomNodePosition>;

/**
 * Load custom node positions from localStorage
 * Returns empty object if no custom positions exist
 */
export function loadCustomPositions(): CustomNodePositions {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored) as CustomNodePositions;
  } catch (error) {
    console.error('Failed to load custom node positions:', error);
    return {};
  }
}

/**
 * Save a single node's position to localStorage
 * Merges with existing custom positions
 */
export function saveNodePosition(nodeId: string, x: number, y: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const positions = loadCustomPositions();
    positions[nodeId] = { x, y };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('Failed to save node position:', error);
  }
}

/**
 * Reset all custom node positions (clear localStorage)
 */
export function resetAllPositions(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset node positions:', error);
  }
}

/**
 * Check if any custom positions exist
 */
export function hasCustomPositions(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null && Object.keys(JSON.parse(stored)).length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a specific node has a custom position
 */
export function hasCustomPosition(nodeId: string): boolean {
  const positions = loadCustomPositions();
  return nodeId in positions;
}
