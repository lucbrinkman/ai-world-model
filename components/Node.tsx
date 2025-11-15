import { Node as NodeType, NodeType as NT, NODE_COLORS, NodeDragEndHandler, NodeDragStateHandler, GRID_SIZE_X, GRID_SIZE_Y } from '@/lib/types';
import { toPercentString, calculateAlpha, calculateNodeBorderWidth } from '@/lib/probability';
import { forwardRef, useState, useRef, useEffect, useCallback } from 'react';

// Helper function to snap coordinate to grid
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

interface NodeProps {
  node: NodeType;
  isSelected: boolean;
  isHovered: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  maxOutcomeProbability: number;
  zoom: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragMove: (nodeIndex: number, deltaX: number, deltaY: number) => void;
  onDragEnd: NodeDragEndHandler;
  onDragStateChange: NodeDragStateHandler;
}

const Node = forwardRef<HTMLDivElement, NodeProps>(({
  node,
  isSelected,
  isHovered,
  transparentPaths,
  minOpacity,
  maxOutcomeProbability,
  zoom,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragMove,
  onDragEnd,
  onDragStateChange,
}, ref) => {
  const { x, y, text, p, type } = node;

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false); // Track if Shift is held during drag
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);
  const didDragRef = useRef(false);
  const internalRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateIntervalMs = 16; // Update arrows at ~60 FPS (every 16ms) during drag

  // Combined ref callback to set both internal ref and forwarded ref
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [ref]);

  // Calculate opacity
  const opacity = calculateAlpha(p, transparentPaths, minOpacity, isSelected || isHovered, maxOutcomeProbability);

  // Calculate border width
  const borderWidth = calculateNodeBorderWidth(p, isSelected || isHovered);

  // Get colors based on node type and state
  const getBorderColor = () => {
    if (isSelected) return NODE_COLORS.SELECTED;

    switch (type) {
      case NT.QUESTION:
        return isHovered ? NODE_COLORS.QUESTION.hover : NODE_COLORS.QUESTION.border;
      case NT.START:
      case NT.INTERMEDIATE:
        return NODE_COLORS.START.border;
      case NT.GOOD:
        return isHovered ? NODE_COLORS.GOOD.hover : NODE_COLORS.GOOD.border;
      case NT.AMBIVALENT:
        return isHovered ? NODE_COLORS.AMBIVALENT.hover : NODE_COLORS.AMBIVALENT.border;
      case NT.EXISTENTIAL:
        return isHovered ? NODE_COLORS.EXISTENTIAL.hover : NODE_COLORS.EXISTENTIAL.border;
      default:
        return '#ffffff';
    }
  };

  const getBackgroundColor = () => {
    if (isSelected) return NODE_COLORS.SELECTED + '26'; // 15% opacity

    switch (type) {
      case NT.QUESTION:
        return isHovered ? NODE_COLORS.QUESTION.bg + '4d' : NODE_COLORS.QUESTION.bg;
      case NT.START:
      case NT.INTERMEDIATE:
        return isHovered ? NODE_COLORS.START.bg + '4d' : NODE_COLORS.START.bg;
      case NT.GOOD:
        return isHovered ? NODE_COLORS.GOOD.hover : NODE_COLORS.GOOD.bg;
      case NT.AMBIVALENT:
        return isHovered ? NODE_COLORS.AMBIVALENT.hover : NODE_COLORS.AMBIVALENT.bg;
      case NT.EXISTENTIAL:
        return isHovered ? NODE_COLORS.EXISTENTIAL.hover : NODE_COLORS.EXISTENTIAL.bg;
      default:
        return '#000000';
    }
  };

  const getTextColor = () => {
    if (isSelected) return NODE_COLORS.SELECTED;
    if (isHovered && type === NT.QUESTION) return NODE_COLORS.QUESTION.hover;
    return '#ffffff';
  };

  // Drag handlers - using global window listeners for reliability
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setShiftHeld(false);
    onDragStateChange(true, false, e.clientX, e.clientY);
    didDragRef.current = false;
    lastUpdateTimeRef.current = Date.now(); // Reset timer for throttling
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: x,
      nodeY: y,
    };

    // Apply immediate visual "lift" effect
    if (internalRef.current) {
      internalRef.current.style.transform = 'translate(-50%, -50%) scale(1.03)';
      internalRef.current.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))';
    }
  };

  // Global mouse move and mouse up handlers
  useEffect(() => {
    if (!isDragging || !dragStartRef.current || !internalRef.current) return;

    const element = internalRef.current;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (!dragStartRef.current) return;

      // Track Shift key state and cursor position
      if (shiftHeld !== e.shiftKey) {
        setShiftHeld(e.shiftKey);
      }
      onDragStateChange(true, e.shiftKey, e.clientX, e.clientY);

      // Calculate raw delta in screen space
      const rawDeltaX = e.clientX - dragStartRef.current.mouseX;
      const rawDeltaY = e.clientY - dragStartRef.current.mouseY;

      // Mark that we've dragged (moved more than a few pixels)
      if (Math.abs(rawDeltaX) > 3 || Math.abs(rawDeltaY) > 3) {
        didDragRef.current = true;
      }

      // Convert to canvas coordinates
      const zoomFactor = zoom / 100;
      const canvasDeltaX = rawDeltaX / zoomFactor;
      const canvasDeltaY = rawDeltaY / zoomFactor;

      // Calculate new position in canvas coordinates
      let newX = dragStartRef.current.nodeX + canvasDeltaX;
      let newY = dragStartRef.current.nodeY + canvasDeltaY;

      // Apply snap to grid unless Shift is held
      // Simple, predictable: what you see during drag = final position
      if (!e.shiftKey) {
        newX = snapToGrid(newX, GRID_SIZE_X);
        newY = snapToGrid(newY, GRID_SIZE_Y);
      }

      // Convert back to delta for transform
      const snappedDeltaX = (newX - dragStartRef.current.nodeX) * zoomFactor;
      const snappedDeltaY = (newY - dragStartRef.current.nodeY) * zoomFactor;

      // Apply snapped transform to DOM element with lift effect
      element.style.transform = `translate(-50%, -50%) scale(1.03) translate(${snappedDeltaX}px, ${snappedDeltaY}px)`;
      element.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))';

      // Throttle edge updates to avoid performance issues
      const now = Date.now();
      if (now - lastUpdateTimeRef.current >= updateIntervalMs) {
        lastUpdateTimeRef.current = now;

        // Trigger bounds recalculation so arrows update (use snapped position)
        const snappedCanvasDeltaX = newX - dragStartRef.current.nodeX;
        const snappedCanvasDeltaY = newY - dragStartRef.current.nodeY;
        onDragMove(node.index, snappedCanvasDeltaX, snappedCanvasDeltaY);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      if (!dragStartRef.current) return;

      // Calculate final position (same logic as mousemove for consistency)
      const rawDeltaX = e.clientX - dragStartRef.current.mouseX;
      const rawDeltaY = e.clientY - dragStartRef.current.mouseY;

      const zoomFactor = zoom / 100;
      const canvasDeltaX = rawDeltaX / zoomFactor;
      const canvasDeltaY = rawDeltaY / zoomFactor;

      let newX = dragStartRef.current.nodeX + canvasDeltaX;
      let newY = dragStartRef.current.nodeY + canvasDeltaY;

      // Apply snap to grid unless Shift was held
      if (!e.shiftKey) {
        newX = snapToGrid(newX, GRID_SIZE_X);
        newY = snapToGrid(newY, GRID_SIZE_Y);
      }

      // Reset transform and remove lift effect
      element.style.transform = 'translate(-50%, -50%)';
      element.style.filter = '';

      // Call the drag end handler to update React state (this will also update arrows)
      onDragEnd(node.id, newX, newY);

      // Reset drag state
      setIsDragging(false);
      setShiftHeld(false);
      onDragStateChange(false, false);
      dragStartRef.current = null;
    };

    // Add global listeners
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, zoom, onDragMove, onDragEnd, node.id, node.index]);

  // Format text (replace | with line breaks)
  const formattedText = text.replace(/\|/g, '\n');
  const lines = formattedText.split('\n');

  // Calculate percent display
  const percent = Math.round(p * 100);

  // Corner radius for top-left (shared between node and badge)
  const topLeftRadius = '8px';

  return (
    <div  // Node container
        ref={setRefs}
        data-node="true"
        className={`absolute border-solid px-1.5 py-0.5 ${isDragging ? '' : 'transition-all duration-200'}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        borderWidth: `${borderWidth}px`,
        borderColor: getBorderColor(),
        backgroundColor: getBackgroundColor(),
        opacity,
        pointerEvents: 'auto',
        minWidth: '120px',
        maxWidth: '150px',
        borderTopLeftRadius: topLeftRadius,
        borderTopRightRadius: '12px',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
        cursor: isDragging ? 'grabbing' : 'pointer',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onClick={() => {
        // Only trigger onClick if we didn't drag
        if (!didDragRef.current) {
          onClick();
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Probability badge at top-left - absolutely positioned */}
      <div
        className="text-xs font-mono px-1.5 py-0.5"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: getBackgroundColor(),
          color: getTextColor(),
          borderRight: `${borderWidth}px solid ${getBorderColor()}`,
          borderBottom: `${borderWidth}px solid ${getBorderColor()}`,
          borderTopLeftRadius: topLeftRadius,
          borderBottomRightRadius: '8px',
          borderTopRightRadius: '0',
          borderBottomLeftRadius: '0',
          fontSize: '0.75rem',
          lineHeight: '1',
        }}
      >
        {percent}
      </div>

      {/* Node text */}
      <div
        className="text-xs font-normal leading-tight text-center"
        style={{
          color: getTextColor(),
          fontWeight: 400,
          paddingTop: '0.1rem',
          paddingBottom: '0.1rem',
        }}
      >
        {/* Invisible spacer to push first line text to the right */}
        <span
          style={{
            float: 'left',
            width: '25px',
            height: '1px',
          }}
        />
        {/* Invisible spacer on right for symmetry */}
        <span
          style={{
            float: 'right',
            width: '25px',
            height: '1px',
          }}
        />
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
});

Node.displayName = 'Node';

export default Node;
