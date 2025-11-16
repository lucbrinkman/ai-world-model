import { Edge as EdgeType, Node, SNAP_DISTANCE } from '@/lib/types';
import { isAncestorOf } from '@/lib/probability';
import { useState, useCallback, useEffect, useRef } from 'react';

interface ConnectorDotsProps {
  edge: EdgeType;
  edgeIndex: number;
  sourceNode: Node;
  targetNode?: Node;
  allNodes: Node[];
  allEdges: EdgeType[];
  nodeBounds: Map<string, DOMRect>;
  sourceBounds?: DOMRect;
  targetBounds?: DOMRect;
  onReconnect?: (edgeIndex: number, end: 'source' | 'target', newNodeIdOrCoords: string | { x: number; y: number }) => void;
  screenToCanvasCoords?: (screenX: number, screenY: number) => { x: number; y: number };
  onPreviewChange?: (previewNode: Node | null, previewPos: { x: number; y: number } | null) => void;
}

export default function ConnectorDots({
  edge,
  edgeIndex,
  sourceNode,
  targetNode,
  allNodes,
  allEdges,
  nodeBounds,
  sourceBounds,
  targetBounds,
  onReconnect,
  screenToCanvasCoords,
  onPreviewChange,
}: ConnectorDotsProps) {
  const [draggingConnector, setDraggingConnector] = useState<'source' | 'target' | null>(null);
  const [hoveredConnector, setHoveredConnector] = useState<'source' | 'target' | null>(null);
  const [previewTargetNode, setPreviewTargetNode] = useState<Node | null>(null);
  const [previewFloatingPos, setPreviewFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const [blockedNodeTooltip, setBlockedNodeTooltip] = useState<{ x: number; y: number } | null>(null);

  // Notify parent of preview state changes
  useEffect(() => {
    onPreviewChange?.(previewTargetNode, previewFloatingPos);
  }, [previewTargetNode, previewFloatingPos, onPreviewChange]);

  // Calculate positions (same logic as Edge.tsx)
  const effectiveTargetNode = previewFloatingPos ? undefined :
    ((draggingConnector === 'target' && previewTargetNode) ? previewTargetNode : targetNode);
  const effectiveTargetBounds = previewFloatingPos ? undefined :
    ((draggingConnector === 'target' && previewTargetNode) ? nodeBounds.get(previewTargetNode.id) : targetBounds);

  let x1 = sourceBounds ? sourceBounds.x + sourceBounds.width / 2 : sourceNode.x;
  let y1 = sourceBounds ? sourceBounds.y + sourceBounds.height / 2 : sourceNode.y;

  let x2: number;
  let y2: number;
  if (previewFloatingPos) {
    x2 = previewFloatingPos.x;
    y2 = previewFloatingPos.y;
  } else if (effectiveTargetNode) {
    x2 = effectiveTargetBounds ? effectiveTargetBounds.x + effectiveTargetBounds.width / 2 : effectiveTargetNode.x;
    y2 = effectiveTargetBounds ? effectiveTargetBounds.y + effectiveTargetBounds.height / 2 : effectiveTargetNode.y;
  } else {
    x2 = edge.targetX ?? 0;
    y2 = edge.targetY ?? 0;
  }

  const sourceWidth = sourceBounds?.width ?? 145;
  const sourceHeight = sourceBounds?.height ?? 55;
  const targetWidth = effectiveTargetNode ? (effectiveTargetBounds?.width ?? 145) : 0;
  const targetHeight = effectiveTargetNode ? (effectiveTargetBounds?.height ?? 55) : 0;

  let dx = x2 - x1;
  let dy = y2 - y1;

  // Adjust to align with box edges
  if (dx > sourceWidth / 2) {
    x1 += sourceWidth / 2;
  } else if (dx < -sourceWidth / 2) {
    x1 -= sourceWidth / 2;
  }
  if (dy > sourceHeight / 2) {
    y1 += sourceHeight / 2;
  } else if (dy < -sourceHeight / 2) {
    y1 -= sourceHeight / 2;
  }

  if (dx > (sourceWidth + targetWidth) / 2) {
    x2 -= targetWidth / 2;
  } else if (dx < -(sourceWidth + targetWidth) / 2) {
    x2 += targetWidth / 2;
  }
  if (dy > (sourceHeight + targetHeight) / 2) {
    y2 -= targetHeight / 2;
  } else if (dy < -(sourceHeight + targetHeight) / 2) {
    y2 += targetHeight / 2;
  }

  x1 -= 1;
  x2 -= 1;
  y1 -= 1;
  y2 -= 1;

  // Handle connector drag
  const handleConnectorMouseDown = useCallback((e: React.MouseEvent, end: 'source' | 'target') => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingConnector(end);
  }, []);

  // Clear tooltip when dragging stops
  useEffect(() => {
    if (!draggingConnector) {
      setBlockedNodeTooltip(null);
    }
  }, [draggingConnector]);

  // Global mouse handlers
  useEffect(() => {
    if (!draggingConnector || !onReconnect) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!screenToCanvasCoords) {
        setDraggingConnector(null);
        setPreviewTargetNode(null);
        setPreviewFloatingPos(null);
        return;
      }

      const canvasPos = screenToCanvasCoords(e.clientX, e.clientY);
      const SNAP_DISTANCE_SQUARED = SNAP_DISTANCE * SNAP_DISTANCE;
      let closestNode: Node | null = null;
      let closestBlockedNode: Node | null = null;
      let minDistanceSquared = SNAP_DISTANCE_SQUARED;
      let minBlockedDistanceSquared = SNAP_DISTANCE_SQUARED;

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        const bounds = nodeBounds.get(node.id);
        if (!bounds) continue;

        // Don't allow connecting back to the source node
        if (node.id === sourceNode.id) continue;

        const closestX = Math.max(bounds.left, Math.min(canvasPos.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(canvasPos.y, bounds.bottom));
        const dx = closestX - canvasPos.x;
        const dy = closestY - canvasPos.y;
        const distSquared = dx * dx + dy * dy;

        // Don't allow creating cycles - check if the candidate node is an ancestor of the source
        if (isAncestorOf(node.id, sourceNode.id, allEdges, allNodes)) {
          // Track the closest blocked node
          if (distSquared < minBlockedDistanceSquared) {
            minBlockedDistanceSquared = distSquared;
            closestBlockedNode = node;
          }
          continue;
        }

        if (distSquared < minDistanceSquared) {
          minDistanceSquared = distSquared;
          closestNode = node;
        }
      }

      // Only reconnect if we have a valid target (not a blocked node)
      if (closestNode) {
        onReconnect?.(edgeIndex, 'target', closestNode.id);
      } else if (!closestBlockedNode) {
        // Only set floating position if we're not hovering over a blocked node
        onReconnect?.(edgeIndex, 'target', canvasPos);
      }
      // If closestBlockedNode exists but no closestNode, don't call onReconnect
      // This leaves the edge at its original position

      setDraggingConnector(null);
      setPreviewTargetNode(null);
      setPreviewFloatingPos(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!screenToCanvasCoords) return;

      const canvasPos = screenToCanvasCoords(e.clientX, e.clientY);
      const SNAP_DISTANCE_SQUARED = SNAP_DISTANCE * SNAP_DISTANCE;
      let closestNode: Node | null = null;
      let closestBlockedNode: { node: Node; bounds: DOMRect } | null = null;
      let minDistanceSquared = SNAP_DISTANCE_SQUARED;
      let minBlockedDistanceSquared = SNAP_DISTANCE_SQUARED;

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        const bounds = nodeBounds.get(node.id);
        if (!bounds) continue;

        // Don't allow connecting back to the source node
        if (node.id === sourceNode.id) continue;

        const closestX = Math.max(bounds.left, Math.min(canvasPos.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(canvasPos.y, bounds.bottom));
        const dx = closestX - canvasPos.x;
        const dy = closestY - canvasPos.y;
        const distSquared = dx * dx + dy * dy;

        // Don't allow creating cycles - check if the candidate node is an ancestor of the source
        if (isAncestorOf(node.id, sourceNode.id, allEdges, allNodes)) {
          // Track the closest blocked node for tooltip
          if (distSquared < minBlockedDistanceSquared) {
            minBlockedDistanceSquared = distSquared;
            closestBlockedNode = { node, bounds };
          }
          continue;
        }

        if (distSquared < minDistanceSquared) {
          minDistanceSquared = distSquared;
          closestNode = node;
        }
      }

      // Handle blocked node tooltip - show immediately
      if (closestBlockedNode) {
        const tooltipX = closestBlockedNode.bounds.x + closestBlockedNode.bounds.width / 2;
        const tooltipY = closestBlockedNode.bounds.y - 10; // Position above the node
        setBlockedNodeTooltip({ x: tooltipX, y: tooltipY });
      } else {
        setBlockedNodeTooltip(null);
      }

      if (closestNode) {
        setPreviewTargetNode(closestNode);
        setPreviewFloatingPos(null);
      } else {
        setPreviewFloatingPos(canvasPos);
        setPreviewTargetNode(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [draggingConnector, onReconnect, edgeIndex, allNodes, allEdges, nodeBounds, sourceNode, screenToCanvasCoords]);

  return (
    <>
      {/* Source connector dot - non-interactive */}
      <div
        style={{
          position: 'absolute',
          left: `${x1}px`,
          top: `${y1}px`,
          transform: 'translate(-50%, -50%)',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#1E90FF',
          border: '2px solid white',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Target connector dot - draggable */}
      <div
        style={{
          position: 'absolute',
          left: `${x2}px`,
          top: `${y2}px`,
          transform: 'translate(-50%, -50%)',
          width: draggingConnector === 'target' || hoveredConnector === 'target' ? '16px' : '12px',
          height: draggingConnector === 'target' || hoveredConnector === 'target' ? '16px' : '12px',
          borderRadius: '50%',
          backgroundColor: draggingConnector === 'target' ? '#FFD700' : (hoveredConnector === 'target' ? '#FFA500' : '#1E90FF'),
          border: '2px solid white',
          cursor: draggingConnector === 'target' ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          zIndex: 100,
        }}
        onMouseDown={(e) => handleConnectorMouseDown(e, 'target')}
        onMouseEnter={() => setHoveredConnector('target')}
        onMouseLeave={() => setHoveredConnector(null)}
      />

      {/* Invisible larger hitbox for easier clicking */}
      <div
        style={{
          position: 'absolute',
          left: `${x2}px`,
          top: `${y2}px`,
          transform: 'translate(-50%, -50%)',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          cursor: draggingConnector === 'target' ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          zIndex: 99,
        }}
        onMouseDown={(e) => handleConnectorMouseDown(e, 'target')}
        onMouseEnter={() => setHoveredConnector('target')}
        onMouseLeave={() => setHoveredConnector(null)}
      />

      {/* Blocked node tooltip */}
      {blockedNodeTooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${blockedNodeTooltip.x}px`,
            top: `${blockedNodeTooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 200,
            border: '2px solid #4b5563',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          }}
        >
          Can&apos;t connect to an earlier node
        </div>
      )}
    </>
  );
}
