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
  label: string; // Display label (e.g., "Plateau", "Continue")
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

// Drag handler callback types
export type NodeDragEndHandler = (nodeId: string, newX: number, newY: number) => void;

// JSON Schema Interfaces (for graphData.json)

// Connection from one node to another (stored under source node)
export interface NodeConnection {
  targetId: string; // ID of target node
  type: EdgeType; // yes | no | always
  label: string; // Display label (e.g., "Plateau", "Continue")
  evidence?: string; // Future: explanation for this connection
  confidence?: number; // Future: 0-100 confidence level
  assumptions?: string; // Future: what must be true for this connection
}

// Node as stored in JSON (before transformation)
export interface GraphNode {
  id: string;
  type: NodeType;
  title: string; // Question or outcome description
  description?: string; // Optional extended explanation
  position: {
    x: number;
    y: number;
  };
  sliderIndex: number | null; // Index of associated slider (null for non-question nodes)
  authorEstimate?: number; // Author's probability estimate for this question (0-100, only for question nodes)
  connections: NodeConnection[]; // Outgoing connections from this node
}

// Metadata about the graph
export interface GraphMetadata {
  version: string;
  title: string;
  canvas: {
    width: number;
    height: number;
  };
}

// Root structure of graphData.json
export interface GraphData {
  metadata: GraphMetadata;
  nodes: GraphNode[];
}

// Constants
export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 1800;
export const SLIDER_DEFAULT_VALUE = 50;
export const SLIDER_COUNT = 21;

// Zoom constants
export const MIN_ZOOM = 25;
export const MAX_ZOOM = 200;
export const ZOOM_STEP = 25;
export const ZOOM_SENSITIVITY = 0.15; // Mouse wheel zoom sensitivity
export const CANVAS_PADDING = 1000; // Padding around canvas for scrolling (px)

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
