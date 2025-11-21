import { Node, Edge, NodeType } from './types';
import graphDataJson from '../graphData.json';
import type { GraphData } from './types';

// Cast imported JSON to GraphData type
const graphData = graphDataJson as GraphData;

// Author's probability estimates (reconstructed from question nodes)
export const AUTHORS_ESTIMATES = graphData.nodes
  .filter(n => n.type === NodeType.QUESTION && n.sliderIndex !== null)
  .sort((a, b) => (a.sliderIndex || 0) - (b.sliderIndex || 0))
  .map(n => n.probability || 50)
  .join('i');

// Transform GraphNode[] to Node[] (add index and probability field)
export const nodes: Node[] = graphData.nodes.map((graphNode, index) => ({
  index,
  id: graphNode.id,
  type: graphNode.type,
  x: graphNode.position.x,
  y: graphNode.position.y,
  text: graphNode.title,
  p: 1.0, // Initial probability, will be calculated
}));

// Create id-to-index mapping
export const nodeIdMap = new Map<string, number>();
nodes.forEach((node, index) => {
  nodeIdMap.set(node.id, index);
});

// Build edges array from node connections
export const edges: Edge[] = [];
graphData.nodes.forEach((graphNode, sourceIndex) => {
  graphNode.connections.forEach(connection => {
    // Skip floating endpoint connections (they have targetX/targetY instead of targetId)
    if (!connection.targetId) {
      return;
    }

    const targetIndex = nodeIdMap.get(connection.targetId);

    if (targetIndex === undefined) {
      throw new Error(`Unknown target node: ${connection.targetId} in connections from ${graphNode.id}`);
    }

    edges.push({
      yn: connection.type,
      source: sourceIndex,
      target: targetIndex,
      p: 0.0, // Initial probability, will be calculated
      label: connection.label,
    });
  });
});

// Get question nodes (type 'n') indices
export const questionNodeIndices = nodes
  .filter(n => n.type === NodeType.QUESTION)
  .map(n => n.index);

// Get start node index
export const startNodeIndex = nodes.findIndex(n => n.type === NodeType.START);

// Build adjacency list (target -> incoming edges)
export const adjacencyList = new Map<number, number[]>();
edges.forEach((edge, edgeIndex) => {
  // Skip edges with floating endpoints (no target node)
  if (edge.target === undefined) {
    return;
  }
  if (!adjacencyList.has(edge.target)) {
    adjacencyList.set(edge.target, []);
  }
  adjacencyList.get(edge.target)!.push(edgeIndex);
});

// Re-export metadata and full graph data for convenience
export const metadata = graphData.metadata;
export { graphData };
