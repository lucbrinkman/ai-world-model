import { Edge as EdgeType, Node, SNAP_DISTANCE } from '@/lib/types';
import { useState, useCallback, useEffect } from 'react';

interface ConnectorDotsProps {
  edge: EdgeType;
  edgeIndex: number;
  sourceNode: Node;
  targetNode?: Node;
  allNodes: Node[];
  nodeBounds: DOMRect[];
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

  // Notify parent of preview state changes
  useEffect(() => {
    onPreviewChange?.(previewTargetNode, previewFloatingPos);
  }, [previewTargetNode, previewFloatingPos, onPreviewChange]);

  // Calculate positions (same logic as Edge.tsx)
  const effectiveTargetNode = previewFloatingPos ? undefined :
    ((draggingConnector === 'target' && previewTargetNode) ? previewTargetNode : targetNode);
  const effectiveTargetBounds = previewFloatingPos ? undefined :
    ((draggingConnector === 'target' && previewTargetNode) ? nodeBounds[previewTargetNode.index] : targetBounds);

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
      let minDistanceSquared = SNAP_DISTANCE_SQUARED;

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        const bounds = nodeBounds[i];
        if (!bounds) continue;

        // Don't allow connecting back to the source node
        if (node.id === sourceNode.id) continue;

        const closestX = Math.max(bounds.left, Math.min(canvasPos.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(canvasPos.y, bounds.bottom));
        const dx = closestX - canvasPos.x;
        const dy = closestY - canvasPos.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared < minDistanceSquared) {
          minDistanceSquared = distSquared;
          closestNode = node;
        }
      }

      if (closestNode) {
        onReconnect?.(edgeIndex, 'target', closestNode.id);
      } else {
        onReconnect?.(edgeIndex, 'target', canvasPos);
      }

      setDraggingConnector(null);
      setPreviewTargetNode(null);
      setPreviewFloatingPos(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!screenToCanvasCoords) return;

      const canvasPos = screenToCanvasCoords(e.clientX, e.clientY);
      const SNAP_DISTANCE_SQUARED = SNAP_DISTANCE * SNAP_DISTANCE;
      let closestNode: Node | null = null;
      let minDistanceSquared = SNAP_DISTANCE_SQUARED;

      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        const bounds = nodeBounds[i];
        if (!bounds) continue;

        // Don't allow connecting back to the source node
        if (node.id === sourceNode.id) continue;

        const closestX = Math.max(bounds.left, Math.min(canvasPos.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(canvasPos.y, bounds.bottom));
        const dx = closestX - canvasPos.x;
        const dy = closestY - canvasPos.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared < minDistanceSquared) {
          minDistanceSquared = distSquared;
          closestNode = node;
        }
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
  }, [draggingConnector, onReconnect, edgeIndex, allNodes, nodeBounds, screenToCanvasCoords]);

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
    </>
  );
}
