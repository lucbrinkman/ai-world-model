// Node types
export type NodeType = 'n' | 's' | 'g' | 'a' | 'e' | 'i';

export const NodeType = {
  QUESTION: 'n' as const,
  START: 's' as const,
  GOOD: 'g' as const,
  AMBIVALENT: 'a' as const,
  EXISTENTIAL: 'e' as const,
  INTERMEDIATE: 'i' as const,
};

// Edge types
export type EdgeType = 'y' | 'n' | '-';

export const EdgeType = {
  YES: 'y' as const,
  NO: 'n' as const,
  E100: '-' as const, // Always 100% probability
};

// Node interface
export interface Node {
  index: number;
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text: string;
  p: number; // Total probability flow going into this node
}

// Edge interface
export interface Edge {
  yn: EdgeType;
  source: number; // Node index
  target: number; // Node index
  p: number; // Total probability flow going through the edge
}

// Application state
export interface AppState {
  sliderValues: number[]; // Array of slider values (0-100)
  selectedNodeIndex: number; // Currently selected node (probability root)
  hoveredNodeIndex: number; // Currently hovered node (-1 if none)
  boldPaths: boolean; // Setting: make more likely paths bolder
  transparentPaths: boolean; // Setting: make less likely paths transparent
  minOpacity: number; // Setting: minimum opacity (0-100)
}

// Constants
export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 1800;
export const SLIDER_DEFAULT_VALUE = 50;
export const SLIDER_COUNT = 21;

// Color scheme (matching original v4)
export const NODE_COLORS = {
  SELECTED: '#FF8B38',
  QUESTION: {
    border: '#8C31AA',
    bg: '#51244d',
    hover: 'rgb(165, 165, 255)',
  },
  START: {
    border: '#36238b',
    bg: '#1d1067',
  },
  GOOD: {
    border: '#31FF5E',
    bg: '#0a3313',
    hover: '#22b241',
  },
  AMBIVALENT: {
    border: '#FFDE31',
    bg: '#332c0a',
    hover: '#b29b21',
  },
  EXISTENTIAL: {
    border: '#FF3131',
    bg: '#330a0a',
    hover: '#b22222',
  },
  INTERMEDIATE: {
    border: '#36238b',
    bg: '#1d1067',
  },
};
