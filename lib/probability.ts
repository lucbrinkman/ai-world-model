import { Node, Edge, EdgeType, NodeType } from './types';
import { nodes as initialNodes, edges as initialEdges, adjacencyList, questionNodeIndices } from './graphData';

/**
 * Calculate probabilities for all nodes and edges based on slider values
 * Port of updateProbabilities() from v4.html (lines 647-686)
 */
export function calculateProbabilities(
  sliderValues: number[],
  probabilityRootIndex: number
): { nodes: Node[]; edges: Edge[] } {
  // Clone nodes and edges to avoid mutation
  const nodes = initialNodes.map(n => ({ ...n }));
  const edges = initialEdges.map(e => ({ ...e }));

  // Convert slider values from 0-100 to 0.0-1.0
  const sliderProbs = sliderValues.map(v => v / 100.0);

  // Memoization maps
  const nodeProbMap = new Map<number, number>();
  const edgeProbMap = new Map<number, number>();

  // Set probability root to 1.0
  nodes[probabilityRootIndex].p = 1.0;
  nodeProbMap.set(probabilityRootIndex, 1.0);

  // Recursive function to calculate node probability
  function getNodeProbability(nodeIndex: number): number {
    if (nodeProbMap.has(nodeIndex)) {
      return nodeProbMap.get(nodeIndex)!;
    }

    // Sum probabilities from all incoming edges
    const incomingEdges = adjacencyList.get(nodeIndex) || [];
    const p = incomingEdges
      .map(edgeIndex => getEdgeProbability(edgeIndex))
      .reduce((sum, prob) => sum + prob, 0.0);

    nodeProbMap.set(nodeIndex, p);
    nodes[nodeIndex].p = p;
    return p;
  }

  // Recursive function to calculate edge probability
  function getEdgeProbability(edgeIndex: number): number {
    if (edgeProbMap.has(edgeIndex)) {
      return edgeProbMap.get(edgeIndex)!;
    }

    const edge = edges[edgeIndex];
    const parentProb = getNodeProbability(edge.source);

    let conditionalProb = 1.0;

    // Calculate conditional probability based on edge type
    if (edge.yn !== EdgeType.E100) {
      // Find the slider index for the source node
      const sliderIndex = questionNodeIndices.indexOf(edge.source);

      if (sliderIndex === -1) {
        throw new Error(`No slider value for node ${edge.source} from edge ${edgeIndex}`);
      }

      const sliderProb = sliderProbs[sliderIndex];

      // YES edge = slider probability, NO edge = 1 - slider probability
      conditionalProb = edge.yn === EdgeType.YES ? sliderProb : 1.0 - sliderProb;
    }

    const p = parentProb * conditionalProb;
    edgeProbMap.set(edgeIndex, p);
    edges[edgeIndex].p = p;
    return p;
  }

  // Calculate probabilities for all nodes
  for (let i = 0; i < nodes.length; i++) {
    getNodeProbability(i);
  }

  // Calculate probabilities for all edges
  for (let i = 0; i < edges.length; i++) {
    getEdgeProbability(i);
  }

  return { nodes, edges };
}

/**
 * Utility functions for probability display
 */
export function toPercentString(p: number): string {
  const percent = p * 100;
  return (percent < 10.0 ? percent.toFixed(1) : percent.toFixed(0)) + '%';
}

export function clamp01(x: number): number {
  return Math.min(1.0, Math.max(0.0, x));
}

/**
 * Calculate alpha (opacity) based on probability and settings
 */
export function calculateAlpha(
  probability: number,
  transparentPaths: boolean,
  minOpacity: number,
  isSelectedOrHovered: boolean
): number {
  if (isSelectedOrHovered) {
    return 1.0;
  }

  if (transparentPaths) {
    const minAlpha = minOpacity / 100.0;
    return interpolate(probability, minAlpha, 1.0);
  }

  return 1.0;
}

/**
 * Calculate arrow width based on probability and settings
 */
export function calculateArrowWidth(
  probability: number,
  boldPaths: boolean
): number {
  if (boldPaths) {
    return Math.round(interpolate(probability, 1, 5));
  }
  return 3;
}

/**
 * Calculate arrow head length based on probability and settings
 */
export function calculateArrowHeadLength(
  probability: number,
  boldPaths: boolean
): number {
  if (boldPaths) {
    return Math.round(interpolate(probability, 8, 25));
  }
  return 16;
}

/**
 * Calculate node border width
 */
export function calculateNodeBorderWidth(
  probability: number,
  isSelectedOrHovered: boolean
): number {
  if (isSelectedOrHovered) {
    return 5;
  }
  return 2;
}

/**
 * Linear interpolation between min and max
 */
function interpolate(p: number, min: number, max: number): number {
  const clamped = clamp01(p);
  return min + (max - min) * clamped;
}
