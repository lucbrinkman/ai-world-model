import { Node as NodeType, Edge as EdgeType, NodeDragEndHandler, NodeDragStateHandler, CANVAS_WIDTH, CANVAS_HEIGHT, MIN_ZOOM, MAX_ZOOM, ZOOM_SENSITIVITY, CANVAS_PADDING, NodeType as NT, type GraphData } from '@/lib/types';
import NodeComponent from './Node';
import EdgeComponent from './Edge';
import ConnectorDots from './ConnectorDots';
import ContextMenu from './ContextMenu';
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';

interface FlowchartProps {
  nodes: NodeType[];
  edges: EdgeType[];
  graphData: GraphData;
  probabilityRootIndex: number;
  previewProbabilityRootIndex?: number | null;
  hoveredNodeIndex: number;
  selectedEdgeIndex: number;
  selectedNodeId: string | null;
  autoEditNodeId: string | null;
  hoveredDestinationDotIndex: number;
  draggingEdgeIndex: number;
  pendingNewArrow?: { nodeId: string; edgeIndex: number; mousePos: { clientX: number; clientY: number } } | null;
  boldPaths: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  maxOutcomeProbability: number;
  zoom: number;
  resetTrigger: number;
  newArrowPreview?: { nodeId: string; pos: { x: number; y: number } } | null;
  onZoomChange: (newZoom: number, cursorX?: number, cursorY?: number) => void;
  onNodeClick: (index: number) => void;
  onSetProbabilityRoot?: (index: number) => void;
  onSetProbabilityRootHoverStart?: (index: number) => void;
  onSetProbabilityRootHoverEnd?: () => void;
  onNodeHover: (index: number) => void;
  onNodeLeave: () => void;
  onNodeDragEnd: NodeDragEndHandler;
  onNodeDragStateChange: NodeDragStateHandler;
  onUpdateNodeText?: (nodeId: string, newText: string) => void;
  onAddNode?: (x: number, y: number) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  onDeleteNode?: (nodeId: string) => void;
  onChangeNodeType?: (nodeId: string, newType: 'n' | 'i' | 'g' | 'a' | 'e') => void;
  onEdgeClick?: (edgeIndex: number) => void;
  onEdgeReconnect?: (edgeIndex: number, end: 'source' | 'target', newNodeIdOrCoords: string | { x: number; y: number }) => void;
  onEdgeLabelUpdate?: (edgeIndex: number, newLabel: string) => void;
  onDeleteEdge?: (edgeIndex: number) => void;
  onAddArrow?: (nodeId: string, direction: 'top' | 'bottom' | 'left' | 'right', nodeWidth?: number, nodeHeight?: number, canvasPos?: { x: number; y: number }, mousePos?: { clientX: number; clientY: number }) => void;
  onNewArrowPreviewChange?: (nodeId: string, pos: { x: number; y: number } | null) => void;
  onCancelNewArrow?: (nodeId: string) => void;
  onConfirmNewArrow?: (nodeId: string, targetX: number, targetY: number) => void;
  onBackgroundClick?: () => void;
  onSliderChange?: (nodeId: string, value: number) => void;
  onSliderChangeComplete?: (nodeId: string) => void;
  onDestinationDotHover?: (edgeIndex: number) => void;
  onDestinationDotLeave?: () => void;
  onDestinationDotDragStart?: (edgeIndex: number) => void;
  onDestinationDotDragEnd?: () => void;
  onCreateNodeFromFloatingArrow?: (edgeIndex: number, position: { x: number; y: number }) => void;
  onAutoEditComplete?: () => void;
  editorCloseTimestampRef?: React.MutableRefObject<number>;
}

export default function Flowchart({
  nodes,
  edges,
  graphData,
  probabilityRootIndex,
  previewProbabilityRootIndex,
  hoveredNodeIndex,
  selectedEdgeIndex,
  selectedNodeId,
  autoEditNodeId,
  hoveredDestinationDotIndex,
  draggingEdgeIndex,
  pendingNewArrow,
  boldPaths,
  transparentPaths,
  minOpacity,
  maxOutcomeProbability,
  zoom,
  resetTrigger,
  newArrowPreview,
  onZoomChange,
  onNodeClick,
  onSetProbabilityRoot,
  onSetProbabilityRootHoverStart,
  onSetProbabilityRootHoverEnd,
  onNodeHover,
  onNodeLeave,
  onNodeDragEnd,
  onNodeDragStateChange,
  onUpdateNodeText,
  onAddNode,
  onNodeSelect,
  onDeleteNode,
  onChangeNodeType,
  onEdgeClick,
  onEdgeReconnect,
  onEdgeLabelUpdate,
  onDeleteEdge,
  onAddArrow,
  onNewArrowPreviewChange,
  onCancelNewArrow,
  onConfirmNewArrow,
  onBackgroundClick,
  onSliderChange,
  onSliderChangeComplete,
  onDestinationDotHover,
  onDestinationDotLeave,
  onDestinationDotDragStart,
  onDestinationDotDragEnd,
  onCreateNodeFromFloatingArrow,
  onAutoEditComplete,
  editorCloseTimestampRef,
}: FlowchartProps) {
  // Create refs for all nodes, indexed by node ID (not array index!)
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [nodeBounds, setNodeBounds] = useState<Map<string, DOMRect>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const didDragRef = useRef(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const lastInteractionRef = useRef<{ type: 'editor-close' | null; timestamp: number }>({ type: null, timestamp: 0 });
  const [edgePreview, setEdgePreview] = useState<{ edgeIndex: number | null; node: NodeType | null; pos: { x: number; y: number } | null }>({ edgeIndex: null, node: null, pos: null });

  // Ref callback to set initial scroll position immediately on mount
  const scrollContainerRefCallback = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    if (node && !isPositioned) {
      // Set initial position to show START node near top-left
      // START node is at canvas position (450, 420)
      // Position it 200px from left edge, 100px from top edge
      node.scrollLeft = CANVAS_PADDING + 270;
      node.scrollTop = CANVAS_PADDING + 320;
      // Make visible now that it's positioned
      setIsPositioned(true);
    }
  }, [isPositioned]);

  // Extract updateBounds as a useCallback so it can be called from anywhere
  // When dragNodeIndex and drag deltas are provided, we manually adjust that node's bounds
  const updateBounds = useCallback((dragNodeIndex?: number, dragDeltaX?: number, dragDeltaY?: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Container border width (must match the border in the container's style)
    const CONTAINER_BORDER_WIDTH = 2;

    const bounds = new Map<string, DOMRect>();
    nodes.forEach((node, index) => {
      const ref = nodeRefs.current.get(node.id);
      if (!ref) {
        bounds.set(node.id, new DOMRect());
        return;
      }

      const rect = ref.getBoundingClientRect();
      // Convert to container-relative coordinates, then adjust for zoom scale
      // Since the container is scaled, we need to divide by zoom to get unscaled canvas coordinates
      // IMPORTANT: Subtract border width because SVG starts at padding edge, not border edge
      const zoomFactor = zoom / 100;
      let x = (rect.left - containerRect.left) / zoomFactor - CONTAINER_BORDER_WIDTH;
      let y = (rect.top - containerRect.top) / zoomFactor - CONTAINER_BORDER_WIDTH;

      // If this is the node being dragged, use the node's original position + delta
      // (getBoundingClientRect returns position AFTER CSS transform, which would double the offset)
      if (index === dragNodeIndex && dragDeltaX !== undefined && dragDeltaY !== undefined) {
        // node.x is the center position, but DOMRect.x should be top-left
        // So we need to subtract half the width/height to convert from center to top-left
        x = node.x - rect.width / (zoomFactor * 2) + dragDeltaX;
        y = node.y - rect.height / (zoomFactor * 2) + dragDeltaY;
      }

      bounds.set(node.id, new DOMRect(
        x,
        y,
        rect.width / zoomFactor,
        rect.height / zoomFactor
      ));
    });

    // Update bounds - React will batch these updates efficiently
    setNodeBounds(bounds);
  }, [zoom, nodes]);


  // Update node bounds whenever nodes change or window resizes
  useEffect(() => {
    // Update bounds immediately since we removed CSS transitions from nodes
    // Use requestAnimationFrame to ensure DOM has been painted
    const rafId = requestAnimationFrame(() => {
      updateBounds();
    });

    // Update on window resize - use wrapper to match event listener signature
    const handleResize = () => updateBounds();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes, updateBounds]);

  // Reset scroll position when reset button is clicked (after initial mount)
  // Use useLayoutEffect to set scroll position before paint (prevents visible jump)
  useLayoutEffect(() => {
    // Skip the initial mount (handled by ref callback), only respond to reset button clicks
    if (resetTrigger > 1 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Reset to show START node near top-left
      // START node is at canvas position (450, 420)
      // Position it 200px from left edge, 100px from top edge
      container.scrollLeft = CANVAS_PADDING + 450 - 200;
      container.scrollTop = CANVAS_PADDING + 420 - 100;
    }
  }, [resetTrigger]);

  // Handle zoom changes and adjust scroll position to keep cursor point stable
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Prevent default browser zoom behavior
        e.preventDefault();

        // Calculate zoom delta
        const delta = -e.deltaY;
        const zoomFactor = 1 + (delta > 0 ? ZOOM_SENSITIVITY : -ZOOM_SENSITIVITY);

        // Calculate new zoom value with constraints
        const oldZoom = zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

        if (newZoom === oldZoom) return; // Already at limit

        // Get cursor position relative to scroll container
        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Calculate what point in canvas coordinates is under the cursor
        const canvasX = (container.scrollLeft + cursorX - CANVAS_PADDING) / (oldZoom / 100);
        const canvasY = (container.scrollTop + cursorY - CANVAS_PADDING) / (oldZoom / 100);

        // Calculate where that point should be after zoom to keep it under cursor
        const newScrollLeft = CANVAS_PADDING + canvasX * (newZoom / 100) - cursorX;
        const newScrollTop = CANVAS_PADDING + canvasY * (newZoom / 100) - cursorY;

        // Use flushSync to force synchronous state update, then immediately adjust scroll
        // This ensures the DOM updates with new zoom before we adjust scroll position
        flushSync(() => {
          onZoomChange(newZoom);
        });

        // Now adjust scroll position immediately after DOM has updated
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = newScrollLeft;
          scrollContainerRef.current.scrollTop = newScrollTop;
        }
      }
    };

    // Add listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if not clicking on a node (nodes have onClick handlers)
    // Check if the target is a node by looking for data-node attribute or button/interactive elements
    const target = e.target as HTMLElement;
    const isNode = target.closest('[data-node]') ||
                   target.tagName === 'BUTTON' ||
                   target.closest('button');

    if (!isNode) {
      e.preventDefault(); // Prevent text selection
      setIsDragging(true);
      didDragRef.current = false; // Reset drag flag

      const container = scrollContainerRef.current;
      if (container) {
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: container.scrollLeft,
          scrollTop: container.scrollTop,
        };
      }
    }
  };

  // Track when an editor closes to prevent immediate context menu opening
  const handleEditorClose = useCallback(() => {
    lastInteractionRef.current = { type: 'editor-close', timestamp: Date.now() };
  }, []);

  // Wrap node click to also close context menu
  const handleNodeClick = useCallback((index: number) => {
    setContextMenu(null);
    onNodeClick(index);
  }, [onNodeClick]);

  // Wrap node drag state change to close context menu when dragging starts
  const handleNodeDragStateChangeWrapper = useCallback((isDragging: boolean, shiftHeld: boolean, cursorX?: number, cursorY?: number) => {
    if (isDragging) {
      setContextMenu(null);
    }
    onNodeDragStateChange(isDragging, shiftHeld, cursorX, cursorY);
  }, [onNodeDragStateChange]);

  // Wrap edge click to also close context menu
  const handleEdgeClick = useCallback((index: number) => {
    setContextMenu(null);
    onEdgeClick?.(index);
  }, [onEdgeClick]);

  // Handle background canvas click for context menu
  // This is ONLY called when clicking the explicit background rect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Don't let this bubble up to scroll container

    // Check 1: Don't open context menu if we just dragged to pan
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    // Check 2: Don't open context menu if we just closed an editor (within 300ms)
    const timeSinceLastInteraction = Date.now() - lastInteractionRef.current.timestamp;
    if (lastInteractionRef.current.type === 'editor-close' && timeSinceLastInteraction < 300) {
      lastInteractionRef.current = { type: null, timestamp: 0 };
      return;
    }

    // Check 2b: Also check document title editor close
    if (editorCloseTimestampRef) {
      const timeSinceTitleEdit = Date.now() - editorCloseTimestampRef.current;
      if (timeSinceTitleEdit < 300) {
        editorCloseTimestampRef.current = 0;
        return;
      }
    }

    // Check 3: If a node is selected, just deselect it (don't open context menu)
    if (selectedNodeId !== null) {
      onBackgroundClick?.();
      return;
    }

    // Check 4: If an edge is selected, just deselect it (don't open context menu)
    if (selectedEdgeIndex !== -1) {
      onBackgroundClick?.();
      return;
    }

    // Deselect any selected edge when clicking background
    onBackgroundClick?.();

    // If context menu is already open, close it instead of opening a new one
    if (contextMenu) {
      setContextMenu(null);
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, [contextMenu, didDragRef, lastInteractionRef, onBackgroundClick, selectedEdgeIndex, selectedNodeId]);

  // Handle adding a node from context menu
  const handleAddNodeFromMenu = () => {
    if (!contextMenu || !onAddNode || !containerRef.current) {
      setContextMenu(null);
      return;
    }

    // Convert screen coordinates to canvas coordinates
    const containerRect = containerRef.current.getBoundingClientRect();
    const zoomFactor = zoom / 100;
    const CONTAINER_BORDER_WIDTH = 2;

    // Calculate canvas position accounting for zoom and border
    // contextMenu x,y are viewport coordinates
    // containerRect gives us the scaled canvas position on screen
    // We need to: get position within scaled canvas, account for border, then unscale
    const canvasX = (contextMenu.x - containerRect.left - CONTAINER_BORDER_WIDTH) / zoomFactor;
    const canvasY = (contextMenu.y - containerRect.top - CONTAINER_BORDER_WIDTH) / zoomFactor;

    onAddNode(canvasX, canvasY);
    setContextMenu(null);
  };

  // Handle edge preview changes (memoized to prevent infinite loops)
  const handlePreviewChange = useCallback((edgeIndex: number, node: NodeType | null, pos: { x: number; y: number } | null) => {
    // Only update if:
    // 1. We're setting actual preview data (node or pos is not null), OR
    // 2. We're clearing the preview for the currently active edge
    setEdgePreview(prev => {
      if (node !== null || pos !== null) {
        // Setting new preview data
        return { edgeIndex, node, pos };
      } else if (prev.edgeIndex === edgeIndex) {
        // Clearing preview for the active edge
        return { edgeIndex: null, node: null, pos: null };
      }
      // Otherwise, don't update (another edge is trying to clear, ignore it)
      return prev;
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scrollContainerRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Mark that we've dragged if moved more than a few pixels
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        if (!didDragRef.current) {
          // Close context menu when we actually start dragging
          setContextMenu(null);
        }
        didDragRef.current = true;
      }

      scrollContainerRef.current.scrollLeft = dragStartRef.current.scrollLeft - deltaX;
      scrollContainerRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse up listener when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div
      ref={scrollContainerRefCallback}
      className="w-full h-full overflow-auto"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging ? 'none' : 'auto',
        opacity: isPositioned ? 1 : 0,
        transition: 'opacity 0.1s ease-in',
      }}
    >
      {/* Large scrollable area */}
      <div
        className="relative"
        style={{
          width: `${CANVAS_WIDTH * (zoom / 100) + CANVAS_PADDING * 2}px`,
          height: `${CANVAS_HEIGHT * (zoom / 100) + CANVAS_PADDING * 2}px`,
          minWidth: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="relative bg-background"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center',
            border: '2px solid #4a5568',
            boxShadow: '0 0 0 4px rgba(74, 85, 104, 0.3)',
          }}
        >
          {/* SVG for edges/arrows */}
          <svg
            className="absolute top-0 left-0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          >
            {/* Background rect - the ONLY element that opens context menu */}
            <rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill="transparent"
              style={{ cursor: isDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}
              onClick={handleBackgroundClick}
            />

            {edges.map((edge, index) => {
              const sourceNode = nodes[edge.source];
              const targetNode = edge.target !== undefined ? nodes[edge.target] : undefined;

              // Get slider value for this edge (if source is a question node)
              // Calculate question node indices dynamically from current nodes
              const questionNodeIndices = nodes
                .filter(n => n.type === NT.QUESTION)
                .map(n => n.index);
              const edgeSourceNode = nodes[edge.source];
              const edgeGraphNode = graphData.nodes.find(n => n.id === edgeSourceNode?.id);
              const sliderValue = edgeGraphNode?.probability ?? null;

              // Get bounding boxes for source and target using node IDs
              const sourceBounds = nodeBounds.get(edgeSourceNode.id);
              const targetBounds = targetNode ? nodeBounds.get(targetNode.id) : undefined;

              // Coordinate conversion function for floating endpoints
              const screenToCanvasCoords = (screenX: number, screenY: number) => {
                if (!containerRef.current || !scrollContainerRef.current) return { x: 0, y: 0 };
                const scrollContainer = scrollContainerRef.current;
                const scrollRect = scrollContainer.getBoundingClientRect();
                const zoomFactor = zoom / 100;

                // Convert screen coords to position within scrollable area, then to canvas coords
                const canvasX = (scrollContainer.scrollLeft + screenX - scrollRect.left - CANVAS_PADDING) / zoomFactor;
                const canvasY = (scrollContainer.scrollTop + screenY - scrollRect.top - CANVAS_PADDING) / zoomFactor;

                return { x: canvasX, y: canvasY };
              };

              // Check if this is the newest edge from the node in newArrowPreview
              // (the most recent NO connection that's being dragged)
              let isNewArrowPreview = false;
              let newArrowPreviewPos: { x: number; y: number } | null = null;
              if (newArrowPreview && sourceNode.id === newArrowPreview.nodeId) {
                // Find the newest NO edge from this node (last one in the connections array)
                const noEdgesFromNode = edges.filter(e =>
                  nodes[e.source].id === sourceNode.id &&
                  e.yn === 'n' &&
                  e.label === 'No'
                );
                const newestNoEdge = noEdgesFromNode[noEdgesFromNode.length - 1];
                if (newestNoEdge && edge === newestNoEdge) {
                  isNewArrowPreview = true;
                  newArrowPreviewPos = newArrowPreview.pos;
                }
              }

              // Create stable key for edge based on source and target IDs
              const edgeKey = targetNode
                ? `${sourceNode.id}-${targetNode.id}-${edge.yn}`
                : `${sourceNode.id}-floating-${edge.targetX}-${edge.targetY}-${edge.yn}`;

              // Check if this edge can be deleted
              const canDelete = index === selectedEdgeIndex && onDeleteEdge && sourceNode.type !== NT.START;
              const outgoingEdges = edges.filter(e => e.source === edge.source);
              const shouldShowDelete = canDelete && (outgoingEdges.length === 1 || outgoingEdges.length === 2);

              return (
                <EdgeComponent
                  key={edgeKey}
                  edge={edge}
                  edgeIndex={index}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  sliderValue={sliderValue}
                  transparentPaths={transparentPaths}
                  boldPaths={boldPaths}
                  minOpacity={minOpacity}
                  maxOutcomeProbability={maxOutcomeProbability}
                  sourceBounds={sourceBounds}
                  targetBounds={targetBounds}
                  isSelected={index === selectedEdgeIndex}
                  onClick={onEdgeClick ? () => handleEdgeClick(index) : undefined}
                  onDelete={shouldShowDelete ? () => onDeleteEdge(index) : undefined}
                  onLabelUpdate={onEdgeLabelUpdate}
                  onEditorClose={handleEditorClose}
                  onDestinationDotHover={onDestinationDotHover ? () => onDestinationDotHover(index) : undefined}
                  onDestinationDotLeave={onDestinationDotLeave}
                  previewTargetNode={edgePreview.edgeIndex === index ? edgePreview.node : null}
                  previewTargetBounds={edgePreview.edgeIndex === index && edgePreview.node ? nodeBounds.get(edgePreview.node.id) : undefined}
                  previewFloatingPos={isNewArrowPreview ? newArrowPreviewPos : (edgePreview.edgeIndex === index ? edgePreview.pos : null)}
                />
              );
            })}
          </svg>

          {/* Nodes (HTML divs positioned absolutely) */}
          {nodes.map((node) => {
            // Calculate slider index for question nodes
            const questionNodeIndices = nodes
              .filter(n => n.type === NT.QUESTION)
              .map(n => n.index);
            const graphNode = graphData.nodes.find(n => n.id === node.id);
            const nodeSliderValue = graphNode?.probability !== null && graphNode?.probability !== undefined ? graphNode.probability : undefined;

            // Calculate if this node is eligible for add arrow buttons
            const outgoingEdges = edges.filter(e => e.source === node.index);
            const isIntermediate = outgoingEdges.length === 1;
            const isOutcomeWithNoArrows =
              (node.type === 'g' || node.type === 'a' || node.type === 'e') &&
              outgoingEdges.length === 0;
            const shouldShowAddArrows =
              node.type !== NT.START &&
              (isIntermediate || isOutcomeWithNoArrows) &&
              onAddArrow !== undefined;

            return (
              <NodeComponent
                key={node.id}
                ref={(el) => { nodeRefs.current.set(node.id, el) }}
                node={node}
                isSelected={node.index === probabilityRootIndex}
                isHovered={node.index === hoveredNodeIndex}
                isNodeSelected={node.id === selectedNodeId}
                isProbabilityRootPreview={previewProbabilityRootIndex !== null && previewProbabilityRootIndex !== undefined && node.index === previewProbabilityRootIndex}
                shouldStartEditing={node.id === autoEditNodeId}
                transparentPaths={transparentPaths}
                minOpacity={minOpacity}
                maxOutcomeProbability={maxOutcomeProbability}
                zoom={zoom}
                onClick={() => handleNodeClick(node.index)}
                onSetProbabilityRoot={onSetProbabilityRoot ? () => onSetProbabilityRoot(node.index) : undefined}
                onSetProbabilityRootHoverStart={onSetProbabilityRootHoverStart ? () => onSetProbabilityRootHoverStart(node.index) : undefined}
                onSetProbabilityRootHoverEnd={onSetProbabilityRootHoverEnd}
                onMouseEnter={() => onNodeHover(node.index)}
                onMouseLeave={onNodeLeave}
                onDragMove={updateBounds}
                onDragEnd={onNodeDragEnd}
                onDragStateChange={handleNodeDragStateChangeWrapper}
                onUpdateText={onUpdateNodeText}
                onEditorClose={handleEditorClose}
                onEditingStarted={onAutoEditComplete}
                onSelect={onNodeSelect}
                onDelete={onDeleteNode}
                onChangeType={onChangeNodeType}
                sliderValue={nodeSliderValue}
                onSliderChange={nodeSliderValue !== undefined && onSliderChange ? (value) => onSliderChange(node.id, value) : undefined}
                onSliderChangeComplete={nodeSliderValue !== undefined && onSliderChangeComplete ? () => onSliderChangeComplete(node.id) : undefined}
                showAddArrows={shouldShowAddArrows}
                onAddArrow={shouldShowAddArrows ? (direction, mousePos) => {
                  const bounds = nodeBounds.get(node.id);
                  // Convert screen coordinates to canvas coordinates if mousePos provided
                  let canvasPos: { x: number; y: number } | undefined;
                  if (mousePos && scrollContainerRef.current) {
                    const scrollContainer = scrollContainerRef.current;
                    const scrollRect = scrollContainer.getBoundingClientRect();
                    const zoomFactor = zoom / 100;
                    canvasPos = {
                      x: (scrollContainer.scrollLeft + mousePos.clientX - scrollRect.left - CANVAS_PADDING) / zoomFactor,
                      y: (scrollContainer.scrollTop + mousePos.clientY - scrollRect.top - CANVAS_PADDING) / zoomFactor
                    };
                  }
                  onAddArrow(node.id, direction, bounds?.width, bounds?.height, canvasPos, mousePos);
                } : undefined}
              />
            );
          })}

          {/* Connector dots (HTML, rendered on top of nodes) */}
          {(() => {
            // Track connection index per source node
            const connectionIndexByNode = new Map<number, number>();

            return edges.map((edge, edgeIndex) => {
              const sourceNode = nodes[edge.source];
              const targetNode = edge.target !== undefined ? nodes[edge.target] : undefined;
              const sourceBounds = nodeBounds.get(sourceNode.id);
              const targetBounds = targetNode ? nodeBounds.get(targetNode.id) : undefined;

              // Track which connection this is for the source node
              const currentConnectionIndex = connectionIndexByNode.get(edge.source) || 0;
              connectionIndexByNode.set(edge.source, currentConnectionIndex + 1);

              // Calculate visibility mode for this edge
              let visibilityMode: 'full' | 'destination-only' | 'hidden';
              if (selectedEdgeIndex === edgeIndex) {
                visibilityMode = 'full';
              } else if (selectedNodeId === sourceNode.id) {
                // Source node is selected, show destination dot only
                visibilityMode = 'destination-only';
              } else if (hoveredDestinationDotIndex === edgeIndex || draggingEdgeIndex === edgeIndex) {
                // Destination dot is being hovered or dragged
                visibilityMode = 'destination-only';
              } else {
                // Default: hidden
                visibilityMode = 'hidden';
              }

              const screenToCanvasCoords = (screenX: number, screenY: number) => {
                if (!containerRef.current || !scrollContainerRef.current) return { x: 0, y: 0 };
                const scrollContainer = scrollContainerRef.current;
                const scrollRect = scrollContainer.getBoundingClientRect();
                const zoomFactor = zoom / 100;

                const canvasX = (scrollContainer.scrollLeft + screenX - scrollRect.left - CANVAS_PADDING) / zoomFactor;
                const canvasY = (scrollContainer.scrollTop + screenY - scrollRect.top - CANVAS_PADDING) / zoomFactor;

                return { x: canvasX, y: canvasY };
              };

              // Check if this is the pending new arrow that should start dragging
              // Compare using the connection index within the source node, not the global edge index
              const isPendingNewArrow = pendingNewArrow?.nodeId === sourceNode.id && pendingNewArrow?.edgeIndex === currentConnectionIndex;

            return (
              <ConnectorDots
                key={`connector-${edgeIndex}`}
                edge={edge}
                edgeIndex={edgeIndex}
                sourceNode={sourceNode}
                targetNode={targetNode}
                allNodes={nodes}
                allEdges={edges}
                nodeBounds={nodeBounds}
                sourceBounds={sourceBounds}
                targetBounds={targetBounds}
                visibilityMode={visibilityMode}
                targetNodeIsSelected={targetNode?.id === selectedNodeId}
                onReconnect={onEdgeReconnect}
                onEdgeSelect={onEdgeClick}
                onDestinationDotHover={onDestinationDotHover ? () => onDestinationDotHover(edgeIndex) : undefined}
                onDestinationDotLeave={onDestinationDotLeave}
                onDestinationDotDragStart={onDestinationDotDragStart ? () => onDestinationDotDragStart(edgeIndex) : undefined}
                onDestinationDotDragEnd={onDestinationDotDragEnd}
                screenToCanvasCoords={screenToCanvasCoords}
                onPreviewChange={(node, pos) => handlePreviewChange(edgeIndex, node, pos)}
                onCreateNodeFromFloatingArrow={onCreateNodeFromFloatingArrow}
                shouldStartDragging={isPendingNewArrow}
                initialMousePos={isPendingNewArrow ? pendingNewArrow?.mousePos : undefined}
              />
            );
            });
          })()}
        </div>
      </div>

      {/* Context menu for adding nodes */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddNode={handleAddNodeFromMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
