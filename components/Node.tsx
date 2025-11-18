import { Node as NodeType, NodeType as NT, NODE_COLORS, NodeDragEndHandler, NodeDragStateHandler, GRID_SIZE_X, GRID_SIZE_Y } from '@/lib/types';
import { toPercentString, calculateAlpha, calculateNodeBorderWidth } from '@/lib/probability';
import { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import OutcomeTypeSwitcher from './OutcomeTypeSwitcher';
import { Trash2, Pin } from 'lucide-react';

// Helper function to snap coordinate to grid
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

interface NodeProps {
  node: NodeType;
  isSelected: boolean;
  isHovered: boolean;
  isNodeSelected: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  maxOutcomeProbability: number;
  zoom: number;
  onClick: () => void;
  onSetProbabilityRoot?: () => void;
  onSetProbabilityRootHoverStart?: () => void;
  onSetProbabilityRootHoverEnd?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDragMove: (nodeIndex: number, deltaX: number, deltaY: number) => void;
  onDragEnd: NodeDragEndHandler;
  onDragStateChange: NodeDragStateHandler;
  onUpdateText?: (nodeId: string, newText: string) => void;
  onEditorClose?: () => void;
  onSelect?: (nodeId: string | null) => void;
  onDelete?: (nodeId: string) => void;
  onChangeType?: (nodeId: string, newType: 'n' | 'i' | 'g' | 'a' | 'e') => void;
  sliderValue?: number;
  onSliderChange?: (value: number) => void;
  onSliderChangeComplete?: () => void;
}

const Node = forwardRef<HTMLDivElement, NodeProps>(({
  node,
  isSelected,
  isHovered,
  isNodeSelected,
  transparentPaths,
  minOpacity,
  maxOutcomeProbability,
  zoom,
  onClick,
  onSetProbabilityRoot,
  onSetProbabilityRootHoverStart,
  onSetProbabilityRootHoverEnd,
  onMouseEnter,
  onMouseLeave,
  onDragMove,
  onDragEnd,
  onDragStateChange,
  onUpdateText,
  onEditorClose,
  onSelect,
  onDelete,
  onChangeType,
  sliderValue,
  onSliderChange,
  onSliderChangeComplete,
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

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Slider popup hover state
  const [isSliderHovered, setIsSliderHovered] = useState(false);

  // Combined ref callback to set both internal ref and forwarded ref
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [ref]);

  // Update edit text when node text changes
  useEffect(() => {
    setEditText(text);
  }, [text]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  //  saveEdit function defined below

  // Handle click outside to save edits
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        const newText = editText.trim();
        if (newText && newText !== text && onUpdateText) {
          onUpdateText(node.id, newText);
        }
        setIsEditing(false);
        onEditorClose?.();
      }
    };

    // Use mousedown instead of click to catch the event before blur
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editText, text, onUpdateText, node.id, onEditorClose]);

  // Edit handlers
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (onUpdateText && !isDragging) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleEditBlur = () => {
    if (isEditing) {
      saveEdit();
    }
  };

  const saveEdit = useCallback(() => {
    const newText = editText.trim();
    if (newText && newText !== text && onUpdateText) {
      onUpdateText(node.id, newText);
    }
    setIsEditing(false);
    onEditorClose?.();
  }, [editText, text, onUpdateText, node.id, onEditorClose]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(text); // Revert changes
      onEditorClose?.();
    }
  };

  // Calculate opacity
  const opacity = calculateAlpha(p, transparentPaths, minOpacity, isSelected || isHovered, maxOutcomeProbability);

  // Calculate border width (only change on selection, not hover)
  const borderWidth = calculateNodeBorderWidth(p, isSelected);

  // Get colors based on node type and state
  // isSelected = probability root (should be orange)
  // isNodeSelected = UI selection (should look hovered)
  const ORANGE_COLOR = '#ff8c00'; // Orange for probability root

  const getBorderColor = () => {
    // Probability root is orange
    if (isSelected) return ORANGE_COLOR;

    switch (type) {
      case NT.QUESTION:
        return (isHovered || isNodeSelected) ? NODE_COLORS.QUESTION.hover : NODE_COLORS.QUESTION.border;
      case NT.START:
      case NT.INTERMEDIATE:
        return NODE_COLORS.START.border;
      case NT.GOOD:
        return (isHovered || isNodeSelected) ? NODE_COLORS.GOOD.hover : NODE_COLORS.GOOD.border;
      case NT.AMBIVALENT:
        return (isHovered || isNodeSelected) ? NODE_COLORS.AMBIVALENT.hover : NODE_COLORS.AMBIVALENT.border;
      case NT.EXISTENTIAL:
        return (isHovered || isNodeSelected) ? NODE_COLORS.EXISTENTIAL.hover : NODE_COLORS.EXISTENTIAL.border;
      default:
        return '#ffffff';
    }
  };

  const getBackgroundColor = () => {
    // Probability root is orange with transparency
    if (isSelected) return ORANGE_COLOR + '33'; // 20% opacity

    switch (type) {
      case NT.QUESTION:
        return (isHovered || isNodeSelected) ? NODE_COLORS.QUESTION.bg + '4d' : NODE_COLORS.QUESTION.bg;
      case NT.START:
      case NT.INTERMEDIATE:
        return (isHovered || isNodeSelected) ? NODE_COLORS.START.bg + '4d' : NODE_COLORS.START.bg;
      case NT.GOOD:
        return (isHovered || isNodeSelected) ? NODE_COLORS.GOOD.hover : NODE_COLORS.GOOD.bg;
      case NT.AMBIVALENT:
        return (isHovered || isNodeSelected) ? NODE_COLORS.AMBIVALENT.hover : NODE_COLORS.AMBIVALENT.bg;
      case NT.EXISTENTIAL:
        return (isHovered || isNodeSelected) ? NODE_COLORS.EXISTENTIAL.hover : NODE_COLORS.EXISTENTIAL.bg;
      default:
        return '#000000';
    }
  };

  const getTextColor = () => {
    // Probability root is orange
    if (isSelected) return ORANGE_COLOR;
    if ((isHovered || isNodeSelected) && type === NT.QUESTION) return NODE_COLORS.QUESTION.hover;
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

      // Calculate delta in canvas coordinates (no zoom conversion needed since parent is scaled)
      const snappedDeltaX = newX - dragStartRef.current.nodeX;
      const snappedDeltaY = newY - dragStartRef.current.nodeY;

      // Apply snapped transform to DOM element with lift effect
      // Use separate transforms to avoid scale affecting translation
      element.style.transform = `translate(calc(-50% + ${snappedDeltaX}px), calc(-50% + ${snappedDeltaY}px)) scale(1.03)`;
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

  // Calculate dynamic spacer width based on badge size
  // Badge width = (digits × ~7.5px/char) + padding (6px each side) + border adjustments
  // Always assume minimum of 2 digits to prevent text jumping when probability changes
  const numDigits = percent === 100 ? 3 : 2;
  const baseCharWidth = 7.5; // Approximate monospace character width at 0.75rem
  const badgePadding = 4; // px-1.5 = 6px on each side
  const borderAdjustment = borderWidth * 0.5; // Account for thicker borders when selected
  const spacerWidth = (numDigits * baseCharWidth) + (badgePadding * 2) + borderAdjustment; // +2px buffer

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
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
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
          // Toggle selection: if already selected, deselect; otherwise select
          if (onSelect) {
            onSelect(isNodeSelected ? null : node.id);
          }
        }
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={isEditing ? undefined : handleMouseDown}
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
      {isEditing ? (
        <textarea
          ref={editInputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEditBlur}
          onKeyDown={handleEditKeyDown}
          className="text-xs font-normal leading-tight text-center resize-none outline-none"
          style={{
            color: getTextColor(),
            backgroundColor: 'transparent',
            fontWeight: 400,
            padding: '0.12rem',
            width: '100%',
            minHeight: '40px',
            border: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="text-xs font-normal leading-tight text-center"
          style={{
            color: getTextColor(),
            fontWeight: 400,
            paddingTop: '0.12rem',
            paddingBottom: '0.12rem',
          }}
        >
          {/* Invisible spacer to push first line text to the right */}
          <span
            style={{
              float: 'left',
              width: `${spacerWidth}px`,
              height: '1px',
              // backgroundColor: 'red', // Red highlight for debugging
            }}
          />
          {/* Invisible spacer on right for symmetry */}
          <span
            style={{
              float: 'right',
              width: `${spacerWidth}px`,
              height: '1px',
              // backgroundColor: 'red', // Red highlight for debugging
            }}
          />
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </div>
      )}

      {/* Button container - shown when node is selected */}
      {isNodeSelected && (
        <div
          className="absolute flex flex-row gap-1 z-10"
          style={{
            top: `${-26 - borderWidth}px`,
            right: `${-borderWidth}px`,
          }}
        >
          {/* Pin button (left) */}
          {onSetProbabilityRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetProbabilityRoot();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                onSetProbabilityRootHoverStart?.();
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                onSetProbabilityRootHoverEnd?.();
              }}
              className={`${isSelected ? 'bg-blue-600' : 'bg-gray-400'} hover:bg-blue-600 text-white rounded w-6 h-6 flex items-center justify-center shadow-lg transition-colors`}
              title="Set as start (100% probability)"
            >
              <Pin size={14} />
            </button>
          )}

          {/* Trash button (right) */}
          {onDelete && node.type !== 's' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="bg-gray-400 hover:bg-red-600 text-white rounded w-6 h-6 flex items-center justify-center shadow-lg transition-colors"
              title="Delete node (Delete/Backspace)"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Outcome type switcher - shown for outcome nodes */}
      {onChangeType && (node.type === 'g' || node.type === 'a' || node.type === 'e') && (
        <OutcomeTypeSwitcher
          nodeId={node.id}
          currentType={node.type}
          isSelected={isNodeSelected}
          onChangeType={onChangeType}
        />
      )}

      {/* Invisible hover target for slider - positioned where slider would appear */}
      {!isDragging && type === NT.QUESTION && sliderValue !== undefined && onSliderChange && !(isHovered || isSliderHovered || isNodeSelected) && (
        <div
          className="absolute pointer-events-auto"
          style={{
            top: '100%',
            left: '-12px',
            right: '-12px',
            height: '40px',
            zIndex: 999,
          }}
          onMouseEnter={() => setIsSliderHovered(true)}
          onMouseLeave={() => setIsSliderHovered(false)}
        />
      )}

      {/* Pop-up slider - shown when hovering or selecting question nodes */}
      {(isHovered || isSliderHovered || isNodeSelected) && !isDragging && type === NT.QUESTION && sliderValue !== undefined && onSliderChange && (
        <div
          className="absolute pointer-events-auto"
          style={{
            top: '100%',
            left: '-12px',
            right: '-12px',
            paddingTop: '8px', // Invisible area to bridge gap above
            paddingBottom: '12px', // Invisible area below
            paddingLeft: '12px', // Invisible area on left
            paddingRight: '12px', // Invisible area on right
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={() => setIsSliderHovered(true)}
          onMouseLeave={() => setIsSliderHovered(false)}
        >
          <div
            className="bg-gray-900 rounded-lg shadow-xl px-2 flex items-center"
            style={{
              paddingTop: '4px',
              paddingBottom: '4px',
            }}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => {
                e.stopPropagation();
                onSliderChange(Number(e.target.value));
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                onSliderChangeComplete?.();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onSliderChangeComplete?.();
              }}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer block"
              style={{
                background: `linear-gradient(to right, ${NODE_COLORS.QUESTION.hover} 0%, ${NODE_COLORS.QUESTION.hover} ${sliderValue}%, #374151 ${sliderValue}%, #374151 100%)`,
                outline: 'none',
                margin: 0,
                padding: 0,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

Node.displayName = 'Node';

export default Node;
