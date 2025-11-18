import { Edge as EdgeType, Node, SNAP_DISTANCE } from '@/lib/types';
import { isAncestorOf } from '@/lib/probability';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

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
  visibilityMode: 'full' | 'destination-only' | 'hidden';
  targetNodeIsSelected?: boolean;
  onReconnect?: (edgeIndex: number, end: 'source' | 'target', newNodeIdOrCoords: string | { x: number; y: number }) => void;
  onEdgeSelect?: (edgeIndex: number) => void;
  onDestinationDotHover?: () => void;
  onDestinationDotLeave?: () => void;
  onDestinationDotDragStart?: () => void;
  onDestinationDotDragEnd?: () => void;
  screenToCanvasCoords?: (screenX: number, screenY: number) => { x: number; y: number };
  onPreviewChange?: (previewNode: Node | null, previewPos: { x: number; y: number } | null) => void;
  onCreateNodeFromFloatingArrow?: (edgeIndex: number, position: { x: number; y: number }) => void;
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
  visibilityMode,
  targetNodeIsSelected,
  onReconnect,
  onEdgeSelect,
  onDestinationDotHover,
  onDestinationDotLeave,
  onDestinationDotDragStart,
  onDestinationDotDragEnd,
  screenToCanvasCoords,
  onPreviewChange,
  onCreateNodeFromFloatingArrow,
}: ConnectorDotsProps) {
  const [draggingConnector, setDraggingConnector] = useState<'source' | 'target' | null>(null);
  const [hoveredConnector, setHoveredConnector] = useState<'source' | 'target' | null>(null);
  const [hoveredPlusButton, setHoveredPlusButton] = useState(false);
  const [previewTargetNode, setPreviewTargetNode] = useState<Node | null>(null);
  const [previewFloatingPos, setPreviewFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const [blockedNodeTooltip, setBlockedNodeTooltip] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

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

  // Helper function to adjust point for rounded corners (same as Edge.tsx)
  const adjustForRoundedCorner = (
    centerX: number,
    centerY: number,
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    topLeftRadius: number,
    topRightRadius: number,
    bottomLeftRadius: number,
    bottomRightRadius: number
  ): { x: number; y: number } => {
    const dx = targetX - centerX;
    const dy = targetY - centerY;

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const absRatioX = Math.abs(dx) / halfWidth;
    const absRatioY = Math.abs(dy) / halfHeight;

    const cornerThreshold = 0.95;
    const inCorner = absRatioX > cornerThreshold && absRatioY > cornerThreshold;

    if (inCorner) {
      let cornerRadius = 0;
      let cornerCenterX = centerX;
      let cornerCenterY = centerY;

      if (dx > 0 && dy < 0) {
        cornerRadius = topRightRadius;
        cornerCenterX = centerX + halfWidth - cornerRadius;
        cornerCenterY = centerY - halfHeight + cornerRadius;
      } else if (dx > 0 && dy > 0) {
        cornerRadius = bottomRightRadius;
        cornerCenterX = centerX + halfWidth - cornerRadius;
        cornerCenterY = centerY + halfHeight - cornerRadius;
      } else if (dx < 0 && dy < 0) {
        cornerRadius = topLeftRadius;
        cornerCenterX = centerX - halfWidth + cornerRadius;
        cornerCenterY = centerY - halfHeight + cornerRadius;
      } else {
        cornerRadius = bottomLeftRadius;
        cornerCenterX = centerX - halfWidth + cornerRadius;
        cornerCenterY = centerY + halfHeight - cornerRadius;
      }

      const dcx = targetX - cornerCenterX;
      const dcy = targetY - cornerCenterY;
      const distToCornerCenter = Math.sqrt(dcx * dcx + dcy * dcy);

      if (distToCornerCenter > 0) {
        const scale = cornerRadius / distToCornerCenter;
        return {
          x: cornerCenterX + dcx * scale,
          y: cornerCenterY + dcy * scale
        };
      }
    }

    let resultX = centerX;
    let resultY = centerY;

    if (absRatioX > absRatioY) {
      resultX = dx > 0 ? centerX + halfWidth : centerX - halfWidth;
      resultY = centerY + (dy / absRatioX);
    } else {
      resultX = centerX + (dx / absRatioY);
      resultY = dy > 0 ? centerY + halfHeight : centerY - halfHeight;
    }

    return { x: resultX, y: resultY };
  };

  // Node corner radii (matching Node.tsx)
  const topLeftRadius = 8;
  const topRightRadius = 12;
  const bottomLeftRadius = 12;
  const bottomRightRadius = 12;

  // Adjust arrow start point to account for rounded corners
  const sourceAdjusted = adjustForRoundedCorner(
    x1, y1, x2, y2,
    sourceWidth, sourceHeight,
    topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius
  );

  // Add 1px clearance by pulling back from the node edge
  const CLEARANCE = 1;
  const sourceAngle = Math.atan2(y2 - sourceAdjusted.y, x2 - sourceAdjusted.x);
  x1 = sourceAdjusted.x + Math.cos(sourceAngle) * CLEARANCE;
  y1 = sourceAdjusted.y + Math.sin(sourceAngle) * CLEARANCE;

  // Adjust arrow end point to account for rounded corners (only if there's a target node)
  if (effectiveTargetNode) {
    const targetAdjusted = adjustForRoundedCorner(
      x2, y2, x1, y1,
      targetWidth, targetHeight,
      topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius
    );

    // Add 1px clearance by pulling back from the node edge
    const targetAngle = Math.atan2(y1 - targetAdjusted.y, x1 - targetAdjusted.x);
    x2 = targetAdjusted.x + Math.cos(targetAngle) * CLEARANCE;
    y2 = targetAdjusted.y + Math.sin(targetAngle) * CLEARANCE;
  }

  // Round coordinates to avoid hydration mismatches from floating point precision
  x1 = Math.round(x1 * 1000) / 1000;
  y1 = Math.round(y1 * 1000) / 1000;
  x2 = Math.round(x2 * 1000) / 1000;
  y2 = Math.round(y2 * 1000) / 1000;

  // Handle connector drag
  const handleConnectorMouseDown = useCallback((e: React.MouseEvent, end: 'source' | 'target') => {
    e.stopPropagation();
    e.preventDefault();
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    setDraggingConnector(end);
    // Notify parent that dragging started
    if (end === 'target') {
      onDestinationDotDragStart?.();
    }
  }, [onDestinationDotDragStart]);

  // Clear tooltip when dragging stops
  useEffect(() => {
    if (!draggingConnector) {
      setBlockedNodeTooltip(null);
    }
  }, [draggingConnector]);

  // Global mouse handlers
  useEffect(() => {
    if (!draggingConnector) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      // Check if this was a click (no movement) or a drag
      const CLICK_THRESHOLD = 5; // pixels
      const isClick = !hasMoved && mouseDownPos &&
        Math.abs(e.clientX - mouseDownPos.x) < CLICK_THRESHOLD &&
        Math.abs(e.clientY - mouseDownPos.y) < CLICK_THRESHOLD;

      if (isClick && visibilityMode === 'destination-only' && onEdgeSelect) {
        // This was a click in destination-only mode, select the edge
        onEdgeSelect(edgeIndex);
        setDraggingConnector(null);
        setPreviewTargetNode(null);
        setPreviewFloatingPos(null);
        setMouseDownPos(null);
        setHasMoved(false);
        onDestinationDotDragEnd?.();
        return;
      }

      // Otherwise, handle as drag/reconnect
      if (!screenToCanvasCoords || !onReconnect) {
        setDraggingConnector(null);
        setPreviewTargetNode(null);
        setPreviewFloatingPos(null);
        setMouseDownPos(null);
        setHasMoved(false);
        onDestinationDotDragEnd?.();
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
      setMouseDownPos(null);
      setHasMoved(false);
      onDestinationDotDragEnd?.();
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!screenToCanvasCoords) return;

      // Track if mouse has moved beyond threshold
      const MOVE_THRESHOLD = 3; // pixels
      if (!hasMoved && mouseDownPos) {
        const dx = e.clientX - mouseDownPos.x;
        const dy = e.clientY - mouseDownPos.y;
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
          setHasMoved(true);
        }
      }

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
  }, [draggingConnector, onReconnect, onEdgeSelect, onDestinationDotDragEnd, edgeIndex, allNodes, allEdges, nodeBounds, sourceNode, screenToCanvasCoords, hasMoved, mouseDownPos, visibilityMode]);

  // Calculate new node position based on arrow direction
  const calculateNewNodePosition = useCallback(() => {
    // Get arrow direction vector (from source to target endpoint)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero for very short arrows
    if (length < 1) {
      return { x: x2 + 50, y: y2 };
    }

    // Normalize and extend beyond floating endpoint
    const offsetDistance = 50;
    const newX = x2 + (dx / length) * offsetDistance;
    const newY = y2 + (dy / length) * offsetDistance;

    return { x: newX, y: newY };
  }, [x1, y1, x2, y2]);

  // Handle plus button click
  const handlePlusButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!onCreateNodeFromFloatingArrow) return;

    const newNodePos = calculateNewNodePosition();
    onCreateNodeFromFloatingArrow(edgeIndex, newNodePos);

    // Clear hover state since the plus button will disappear after creating the node
    setHoveredPlusButton(false);
    onDestinationDotLeave?.();
  }, [onCreateNodeFromFloatingArrow, edgeIndex, calculateNewNodePosition, onDestinationDotLeave]);

  // Calculate plus button position (diagonal: top-right relative to arrow direction)
  const getPlusButtonPosition = useCallback(() => {
    // Get arrow direction vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Avoid division by zero for very short arrows
    if (length < 1) {
      return { x: x2 + 20, y: y2 - 20 };
    }

    // Normalize the direction
    const dirX = dx / length;
    const dirY = dy / length;

    // Get perpendicular to the right (rotate 90 degrees counter-clockwise in screen coords)
    const perpRightX = -dirY;
    const perpRightY = dirX;

    // Position diagonally: forward along arrow + perpendicular to the right
    const forwardOffset = 18; // Offset along the arrow direction
    const rightOffset = 18; // Offset perpendicular to the right

    const plusX = x2 + (dirX * forwardOffset) + (perpRightX * rightOffset);
    const plusY = y2 + (dirY * forwardOffset) + (perpRightY * rightOffset);

    return { x: plusX, y: plusY };
  }, [x1, y1, x2, y2]);

  // Check if this is a floating arrow (only show plus button for floating arrows)
  const isFloatingArrow = edge.target === undefined;

  // For floating arrows, always render plus button hitbox (even when dots are hidden)
  // This allows hovering the plus button area to show both buttons
  if (visibilityMode === 'hidden' && isFloatingArrow && onCreateNodeFromFloatingArrow && !draggingConnector) {
    const plusPos = getPlusButtonPosition();

    return (
      <div
        style={{
          position: 'absolute',
          left: `${plusPos.x}px`,
          top: `${plusPos.y}px`,
          transform: 'translate(-50%, -50%)',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: targetNodeIsSelected ? 499 : 999,
        }}
        onClick={handlePlusButtonClick}
        onMouseEnter={() => {
          setHoveredPlusButton(true);
          onDestinationDotHover?.();
        }}
        onMouseLeave={() => {
          setHoveredPlusButton(false);
          onDestinationDotLeave?.();
        }}
      />
    );
  }

  // Don't render anything else if hidden
  if (visibilityMode === 'hidden') {
    return null;
  }

  return (
    <>
      {/* Source connector dot - non-interactive */}
      {visibilityMode === 'full' && (
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
      )}

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
          zIndex: targetNodeIsSelected ? 500 : 1000,
        }}
        onMouseDown={(e) => handleConnectorMouseDown(e, 'target')}
        onMouseEnter={() => {
          setHoveredConnector('target');
          onDestinationDotHover?.();
        }}
        onMouseLeave={() => {
          setHoveredConnector(null);
          onDestinationDotLeave?.();
        }}
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
          zIndex: targetNodeIsSelected ? 499 : 999,
        }}
        onMouseDown={(e) => handleConnectorMouseDown(e, 'target')}
        onMouseEnter={() => {
          setHoveredConnector('target');
          onDestinationDotHover?.();
        }}
        onMouseLeave={() => {
          setHoveredConnector(null);
          onDestinationDotLeave?.();
        }}
      />

      {/* Plus button for creating nodes (only for floating arrows, hide when dragging) */}
      {isFloatingArrow && onCreateNodeFromFloatingArrow && !draggingConnector && (() => {
        const plusPos = getPlusButtonPosition();
        const buttonSize = hoveredPlusButton ? 16 : 12;

        return (
          <>
            {/* Visible plus button */}
            <div
              style={{
                position: 'absolute',
                left: `${plusPos.x}px`,
                top: `${plusPos.y}px`,
                transform: `translate(-50%, -50%) ${hoveredPlusButton ? 'scale(1.1)' : 'scale(1)'}`,
                width: `${buttonSize}px`,
                height: `${buttonSize}px`,
                borderRadius: '50%',
                backgroundColor: hoveredPlusButton ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.3)', // blue-500/60 and blue-500/30
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: targetNodeIsSelected ? 500 : 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onClick={handlePlusButtonClick}
              onMouseEnter={() => {
                setHoveredPlusButton(true);
                onDestinationDotHover?.();
              }}
              onMouseLeave={() => {
                setHoveredPlusButton(false);
                onDestinationDotLeave?.();
              }}
            >
              {/* Lucide Plus icon */}
              <Plus size={buttonSize - 4} color="white" strokeWidth={2.5} />
            </div>

            {/* Invisible larger hitbox for easier clicking */}
            <div
              style={{
                position: 'absolute',
                left: `${plusPos.x}px`,
                top: `${plusPos.y}px`,
                transform: 'translate(-50%, -50%)',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: targetNodeIsSelected ? 499 : 999,
              }}
              onClick={handlePlusButtonClick}
              onMouseEnter={() => {
                setHoveredPlusButton(true);
                onDestinationDotHover?.();
              }}
              onMouseLeave={() => {
                setHoveredPlusButton(false);
                onDestinationDotLeave?.();
              }}
            />
          </>
        );
      })()}

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
