import { Node as NodeType, Edge as EdgeType, NodeDragEndHandler, NodeDragStateHandler, CANVAS_WIDTH, CANVAS_HEIGHT, MIN_ZOOM, MAX_ZOOM, ZOOM_SENSITIVITY, CANVAS_PADDING } from '@/lib/types';
import { questionNodeIndices } from '@/lib/graphData';
import NodeComponent from './Node';
import EdgeComponent from './Edge';
import ContextMenu from './ContextMenu';
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';

interface FlowchartProps {
  nodes: NodeType[];
  edges: EdgeType[];
  sliderValues: number[];
  selectedNodeIndex: number;
  hoveredNodeIndex: number;
  boldPaths: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  maxOutcomeProbability: number;
  zoom: number;
  resetTrigger: number;
  onZoomChange: (newZoom: number, cursorX?: number, cursorY?: number) => void;
  onNodeClick: (index: number) => void;
  onNodeHover: (index: number) => void;
  onNodeLeave: () => void;
  onNodeDragEnd: NodeDragEndHandler;
  onNodeDragStateChange: NodeDragStateHandler;
  onUpdateNodeText?: (nodeId: string, newText: string) => void;
  onAddNode?: (x: number, y: number) => void;
}

export default function Flowchart({
  nodes,
  edges,
  sliderValues,
  selectedNodeIndex,
  hoveredNodeIndex,
  boldPaths,
  transparentPaths,
  minOpacity,
  maxOutcomeProbability,
  zoom,
  resetTrigger,
  onZoomChange,
  onNodeClick,
  onNodeHover,
  onNodeLeave,
  onNodeDragEnd,
  onNodeDragStateChange,
  onUpdateNodeText,
  onAddNode,
}: FlowchartProps) {
  // Create refs for all nodes
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nodeBounds, setNodeBounds] = useState<DOMRect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Ref callback to set initial scroll position immediately on mount
  const scrollContainerRefCallback = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node;
    if (node && !isPositioned) {
      // Set initial position immediately when element is created
      node.scrollLeft = CANVAS_PADDING;
      node.scrollTop = CANVAS_PADDING;
      // Make visible now that it's positioned
      setIsPositioned(true);
    }
  }, [isPositioned]);

  // Extract updateBounds as a useCallback so it can be called from anywhere
  // When dragNodeIndex and drag deltas are provided, we manually adjust that node's bounds
  const updateBounds = useCallback((dragNodeIndex?: number, dragDeltaX?: number, dragDeltaY?: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const bounds = nodeRefs.current.map((ref, index) => {
      if (!ref) return new DOMRect();
      const rect = ref.getBoundingClientRect();
      // Convert to container-relative coordinates, then adjust for zoom scale
      // Since the container is scaled, we need to divide by zoom to get unscaled canvas coordinates
      const zoomFactor = zoom / 100;
      let x = (rect.left - containerRect.left) / zoomFactor;
      let y = (rect.top - containerRect.top) / zoomFactor;

      // If this is the node being dragged, use the node's original position + delta
      // (getBoundingClientRect returns position AFTER CSS transform, which would double the offset)
      if (index === dragNodeIndex && dragDeltaX !== undefined && dragDeltaY !== undefined) {
        // nodes[index].x is the center position, but DOMRect.x should be top-left
        // So we need to subtract half the width/height to convert from center to top-left
        x = nodes[index].x - rect.width / (zoomFactor * 2) + dragDeltaX;
        y = nodes[index].y - rect.height / (zoomFactor * 2) + dragDeltaY;
      }

      return new DOMRect(
        x,
        y,
        rect.width / zoomFactor,
        rect.height / zoomFactor
      );
    });

    // Update bounds - React will batch these updates efficiently
    setNodeBounds(bounds);
  }, [zoom, nodes]);


  // Update node bounds whenever nodes change or window resizes
  useEffect(() => {
    // Wait for CSS transitions to complete (nodes have transition-all duration-200)
    // This fixes the issue where reset positions doesn't update arrows until second click
    const timeoutId = setTimeout(() => {
      updateBounds();
    }, 250); // Wait slightly longer than the 200ms transition

    // Update on window resize (wrap to avoid type mismatch)
    const handleResize = () => updateBounds();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes, updateBounds]);

  // Reset scroll position when reset button is clicked (after initial mount)
  // Use useLayoutEffect to set scroll position before paint (prevents visible jump)
  useLayoutEffect(() => {
    // Skip the initial mount (handled by ref callback), only respond to reset button clicks
    if (resetTrigger > 1 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Position the top-left of the canvas at the top-left of the viewport
      // The canvas is centered in the large area with CANVAS_PADDING on all sides
      container.scrollLeft = CANVAS_PADDING;
      container.scrollTop = CANVAS_PADDING;
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

  // Handle canvas click for context menu (fires after mouseup if no drag occurred)
  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('[data-node]') ||
                   target.tagName === 'BUTTON' ||
                   target.closest('button');

    if (!isNode) {
      // Clicking on canvas
      e.preventDefault();

      // If context menu is already open, close it instead of opening a new one
      if (contextMenu) {
        setContextMenu(null);
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    } else {
      // Clicking on a node - close context menu if open
      if (contextMenu) {
        setContextMenu(null);
      }
    }
  };

  // Handle adding a node from context menu
  const handleAddNodeFromMenu = () => {
    if (!contextMenu || !onAddNode || !containerRef.current || !scrollContainerRef.current) {
      setContextMenu(null);
      return;
    }

    // Convert screen coordinates to canvas coordinates
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const zoomFactor = zoom / 100;

    // Calculate canvas position accounting for scroll, zoom, and padding
    const canvasX = (scrollContainer.scrollLeft + contextMenu.x - containerRect.left - CANVAS_PADDING) / zoomFactor;
    const canvasY = (scrollContainer.scrollTop + contextMenu.y - containerRect.top - CANVAS_PADDING) / zoomFactor;

    onAddNode(canvasX, canvasY);
    setContextMenu(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scrollContainerRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
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
      onClick={handleCanvasClick}
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
            className="absolute top-0 left-0 pointer-events-none"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          >
            {edges.map((edge, index) => {
              const sourceNode = nodes[edge.source];
              const targetNode = nodes[edge.target];

              // Get slider value for this edge (if source is a question node)
              const sliderIndex = questionNodeIndices.indexOf(edge.source);
              const sliderValue = sliderIndex >= 0 ? sliderValues[sliderIndex] : null;

              // Get bounding boxes for source and target
              const sourceBounds = nodeBounds[edge.source];
              const targetBounds = nodeBounds[edge.target];

              return (
                <EdgeComponent
                  key={index}
                  edge={edge}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  sliderValue={sliderValue}
                  transparentPaths={transparentPaths}
                  boldPaths={boldPaths}
                  minOpacity={minOpacity}
                  maxOutcomeProbability={maxOutcomeProbability}
                  sourceBounds={sourceBounds}
                  targetBounds={targetBounds}
                />
              );
            })}
          </svg>

          {/* Nodes (HTML divs positioned absolutely) */}
          {nodes.map((node) => (
            <NodeComponent
              key={node.index}
              ref={(el) => { nodeRefs.current[node.index] = el }}
              node={node}
              isSelected={node.index === selectedNodeIndex}
              isHovered={node.index === hoveredNodeIndex}
              transparentPaths={transparentPaths}
              minOpacity={minOpacity}
              maxOutcomeProbability={maxOutcomeProbability}
              zoom={zoom}
              onClick={() => onNodeClick(node.index)}
              onMouseEnter={() => onNodeHover(node.index)}
              onMouseLeave={onNodeLeave}
              onDragMove={updateBounds}
              onDragEnd={onNodeDragEnd}
              onDragStateChange={onNodeDragStateChange}
              onUpdateText={onUpdateNodeText}
            />
          ))}
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
