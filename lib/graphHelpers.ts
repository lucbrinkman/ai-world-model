import { graphData, nodes, edges, nodeIdMap } from './graphData';
import type { GraphNode, GraphData } from './types';
import { NodeType, EdgeType } from './types';

/**
 * Get a node with all its details including connections
 */
export function getNodeWithConnections(nodeId: string): GraphNode | null {
  const node = graphData.nodes.find(n => n.id === nodeId);
  return node || null;
}

/**
 * Serialize the graph structure into a text format optimized for LLM understanding
 * This creates a human-readable representation of the graph structure
 */
export function serializeForLLM(): string {
  let output = `# ${graphData.metadata.title}\n\n`;
  output += `## Graph Structure\n\n`;
  output += `This is a directed acyclic graph (DAG) representing different AI future scenarios.\n`;
  output += `The graph contains ${nodes.length} nodes and ${edges.length} connections.\n\n`;

  // Group nodes by type
  const nodesByType: Record<string, GraphNode[]> = {
    [NodeType.START]: [], // start
    [NodeType.QUESTION]: [], // question
    [NodeType.INTERMEDIATE]: [], // intermediate
    [NodeType.GOOD]: [], // good outcome
    [NodeType.AMBIVALENT]: [], // ambivalent outcome
    [NodeType.EXISTENTIAL]: [], // existential risk
  };

  graphData.nodes.forEach(node => {
    if (!nodesByType[node.type]) {
      nodesByType[node.type] = [];
    }
    nodesByType[node.type].push(node);
  });

  // Output nodes by type
  const typeNames = {
    [NodeType.START]: 'Start Node',
    [NodeType.QUESTION]: 'Question Nodes (with probability sliders)',
    [NodeType.INTERMEDIATE]: 'Intermediate Nodes',
    [NodeType.GOOD]: 'Good Outcomes',
    [NodeType.AMBIVALENT]: 'Ambivalent Outcomes',
    [NodeType.EXISTENTIAL]: 'Existential Risk Outcomes',
  };

  for (const [type, name] of Object.entries(typeNames)) {
    const nodesOfType = nodesByType[type];
    if (nodesOfType.length === 0) continue;

    output += `### ${name}\n\n`;

    nodesOfType.forEach(node => {
      output += `**${node.id}**: ${node.title}\n`;

      if (node.sliderIndex !== null) {
        output += `  - Slider Index: ${node.sliderIndex}\n`;
      }

      if (node.connections.length > 0) {
        output += `  - Outgoing Connections:\n`;
        node.connections.forEach(conn => {
          const typeLabel = conn.type === EdgeType.YES ? 'YES' : conn.type === EdgeType.NO ? 'NO' : 'ALWAYS';
          output += `    - [${typeLabel}${conn.label ? ` - "${conn.label}"` : ''}] → ${conn.targetId}\n`;
        });
      } else {
        output += `  - Terminal node (no outgoing connections)\n`;
      }

      output += `\n`;
    });
  }

  return output;
}

/**
 * Get all paths from a start node to an end node
 * Returns an array of paths, where each path is an array of node IDs
 */
export function findPaths(startNodeId: string, endNodeId: string): string[][] {
  const startNode = graphData.nodes.find(n => n.id === startNodeId);
  const endNode = graphData.nodes.find(n => n.id === endNodeId);

  if (!startNode || !endNode) {
    return [];
  }

  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(currentId: string, path: string[]) {
    if (currentId === endNodeId) {
      paths.push([...path, currentId]);
      return;
    }

    if (visited.has(currentId)) {
      return; // Avoid cycles
    }

    visited.add(currentId);
    const node = graphData.nodes.find(n => n.id === currentId);

    if (node) {
      node.connections.forEach(conn => {
        // Skip floating endpoint connections
        if (conn.targetId) {
          dfs(conn.targetId, [...path, currentId]);
        }
      });
    }

    visited.delete(currentId);
  }

  dfs(startNodeId, []);
  return paths;
}

/**
 * Validate the graph structure
 * Returns an object with validation results
 */
export function validateGraph(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for orphaned nodes (nodes with no incoming or outgoing connections)
  const nodesWithIncoming = new Set<string>();
  const nodesWithOutgoing = new Set<string>();

  graphData.nodes.forEach(node => {
    if (node.connections.length > 0) {
      nodesWithOutgoing.add(node.id);
      node.connections.forEach(conn => {
        // Skip floating endpoint connections
        if (conn.targetId) {
          nodesWithIncoming.add(conn.targetId);
        }
      });
    }
  });

  graphData.nodes.forEach(node => {
    if (node.type !== NodeType.START && !nodesWithIncoming.has(node.id) && !nodesWithOutgoing.has(node.id)) {
      warnings.push(`Orphaned node: ${node.id} (${node.title})`);
    }
  });

  // Check for invalid target references
  graphData.nodes.forEach(node => {
    node.connections.forEach(conn => {
      // Skip floating endpoint connections
      if (conn.targetId) {
        const targetExists = graphData.nodes.some(n => n.id === conn.targetId);
        if (!targetExists) {
          errors.push(`Invalid connection from ${node.id} to non-existent node ${conn.targetId}`);
        }
      }
    });
  });

  // Check for cycles (DAG should not have cycles)
  const hasCycle = detectCycle();
  if (hasCycle) {
    errors.push('Graph contains cycles (should be acyclic)');
  }

  // Check slider indices are sequential and start at 0
  const questionNodes = graphData.nodes
    .filter(n => n.type === NodeType.QUESTION && n.sliderIndex !== null)
    .sort((a, b) => (a.sliderIndex || 0) - (b.sliderIndex || 0));

  questionNodes.forEach((node, index) => {
    if (node.sliderIndex !== index) {
      warnings.push(`Slider index gap: node ${node.id} has sliderIndex ${node.sliderIndex}, expected ${index}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect if the graph contains a cycle
 */
function detectCycle(): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    if (recStack.has(nodeId)) {
      return true; // Cycle detected
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recStack.add(nodeId);

    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      for (const conn of node.connections) {
        // Skip floating endpoint connections
        if (conn.targetId && hasCycleDFS(conn.targetId)) {
          return true;
        }
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of graphData.nodes) {
    if (hasCycleDFS(node.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Get statistics about the graph
 */
export function getGraphStats() {
  const stats = {
    totalNodes: graphData.nodes.length,
    totalConnections: edges.length,
    nodesByType: {
      start: graphData.nodes.filter(n => n.type === NodeType.START).length,
      question: graphData.nodes.filter(n => n.type === NodeType.QUESTION).length,
      intermediate: graphData.nodes.filter(n => n.type === NodeType.INTERMEDIATE).length,
      good: graphData.nodes.filter(n => n.type === NodeType.GOOD).length,
      ambivalent: graphData.nodes.filter(n => n.type === NodeType.AMBIVALENT).length,
      existential: graphData.nodes.filter(n => n.type === NodeType.EXISTENTIAL).length,
    },
    terminalNodes: graphData.nodes.filter(n => n.connections.length === 0).length,
    questionNodeCount: graphData.nodes.filter(n => n.type === NodeType.QUESTION).length,
  };

  return stats;
}

/**
 * Export the full graph data structure
 * Useful for LLMs that need the complete structured data
 */
export function exportFullGraphData(): GraphData {
  return graphData;
}
