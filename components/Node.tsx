import { Node as NodeType, NodeType as NT, NODE_COLORS, NodeDragEndHandler, NodeDragStateHandler, GRID_SIZE_X, GRID_SIZE_Y } from '@/lib/types';
import { toPercentString, calculateAlpha, calculateNodeBorderWidth } from '@/lib/probability';
import { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import OutcomeTypeSwitcher from './OutcomeTypeSwitcher';
import { Trash2, Pin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import Tooltip from './Tooltip';

// Helper function to snap coordinate to grid
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

interface NodeProps {
  node: NodeType;
  isSelected: boolean;
  isHovered: boolean;
  isNodeSelected: boolean;
  isProbabilityRootPreview?: boolean;
  shouldStartEditing?: boolean;
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
  onEditingStarted?: () => void;
  onSelect?: (nodeId: string | null) => void;
  onDelete?: (nodeId: string) => void;
  onChangeType?: (nodeId: string, newType: 'n' | 'i' | 'g' | 'a' | 'e') => void;
  sliderValue?: number;
  onSliderChange?: (value: number) => void;
  onSliderChangeComplete?: () => void;
  showAddArrows?: boolean;
  onAddArrow?: (direction: 'top' | 'bottom' | 'left' | 'right') => void;
}

const Node = forwardRef<HTMLDivElement, NodeProps>(({
  node,
  isSelected,
  isHovered,
  isNodeSelected,
  isProbabilityRootPreview = false,
  shouldStartEditing,
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
  onEditingStarted,
  onSelect,
  onDelete,
  onChangeType,
  sliderValue,
  onSliderChange,
  onSliderChangeComplete,
  showAddArrows,
  onAddArrow,
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

  // Pin button click cooldown - prevents hover preview immediately after clicking
  const pinClickCooldownRef = useRef(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Slider dragging state - only needed to keep slider visible while dragging
  const [isSliderDragging, setIsSliderDragging] = useState(false);

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

  // Auto-focus and select all text when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      // Select all text in contentEditable
      const range = document.createRange();
      range.selectNodeContents(editInputRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  // Auto-start editing when requested
  useEffect(() => {
    if (shouldStartEditing && onUpdateText && !isDragging) {
      setIsEditing(true);
      onEditingStarted?.();
    }
  }, [shouldStartEditing, onUpdateText, isDragging, onEditingStarted]);

  //  saveEdit function defined below

  // Handle click outside to save edits
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        const newText = editInputRef.current.textContent?.trim() || '';
        if (newText && newText !== text && onUpdateText) {
          onUpdateText(node.id, newText);
        }
        setIsEditing(false);
        onEditorClose?.();
        // Clear text selection
        window.getSelection()?.removeAllRanges();
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
    const newText = editInputRef.current?.textContent?.trim() || '';
    if (newText && newText !== text && onUpdateText) {
      onUpdateText(node.id, newText);
    }
    setIsEditing(false);
    onEditorClose?.();
    // Clear text selection
    window.getSelection()?.removeAllRanges();
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
    // Probability root is orange (actually set)
    if (isSelected) return ORANGE_COLOR;

    // Preview hover on "Set as Start" button - show orange but don't change border width
    if (isProbabilityRootPreview) return ORANGE_COLOR;

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
    // Probability root is orange with transparency (actually set)
    if (isSelected) return ORANGE_COLOR + '33'; // 20% opacity

    // Preview hover on "Set as Start" button - show orange background
    if (isProbabilityRootPreview) return ORANGE_COLOR + '33'; // 20% opacity

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
    // Probability root is orange (actually set)
    if (isSelected) return ORANGE_COLOR;

    // Preview hover on "Set as Start" button - show orange text
    if (isProbabilityRootPreview) return ORANGE_COLOR;

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

  // For question nodes with sliders, extend the hover area to include the slider
  const showSlider = !isDragging && type === NT.QUESTION && sliderValue !== undefined && onSliderChange;

  return (
    <div  // Node container (also group for hover)
        ref={setRefs}
        data-node="true"
        className="group absolute border-solid px-1.5 py-0.5"
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
        zIndex: isNodeSelected ? 1000 : 'auto',
      }}
      onClick={() => {
        // Only trigger onClick if we didn't drag
        if (!didDragRef.current) {
          onClick();
          // If already selected, start editing on single click
          if (isNodeSelected && onUpdateText) {
            setIsEditing(true);
          } else {
            // Toggle selection: if already selected, deselect; otherwise select
            if (onSelect) {
              onSelect(isNodeSelected ? null : node.id);
            }
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

      {/* Node text - single contentEditable div for both display and editing */}
      <div
        ref={editInputRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleEditBlur}
        onKeyDown={handleEditKeyDown}
        className="text-xs font-normal leading-tight text-center outline-none"
        style={{
          color: getTextColor(),
          fontWeight: 400,
          paddingTop: '0.12rem',
          paddingBottom: '0.12rem',
          cursor: isEditing ? 'text' : 'pointer',
        }}
        onClick={(e) => {
          if (isEditing) {
            e.stopPropagation();
          }
        }}
      >
        {/* Invisible spacer to push first line text to the right */}
        <span
          style={{
            float: 'left',
            width: `${spacerWidth}px`,
            height: '1px',
          }}
        />
        {/* Invisible spacer on right for symmetry */}
        <span
          style={{
            float: 'right',
            width: `${spacerWidth}px`,
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

      {/* Button container - shown when node is selected */}
      {isNodeSelected && (
        <div
          className="absolute flex flex-row gap-1 z-10"
          style={{
            top: `${-23 - borderWidth}px`,
            right: `${-borderWidth}px`,
          }}
        >
          {/* Pin button (left) */}
          {onSetProbabilityRoot && (
            <Tooltip content={isSelected ? "Remove as start" : "Set as start"} position="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pinClickCooldownRef.current = true;
                  onSetProbabilityRootHoverEnd?.(); // Clear any existing hover
                  onSetProbabilityRoot();
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  if (!pinClickCooldownRef.current) {
                    onSetProbabilityRootHoverStart?.();
                  }
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  pinClickCooldownRef.current = false; // Reset cooldown when mouse leaves
                  onSetProbabilityRootHoverEnd?.();
                }}
                className="text-white rounded w-5 h-5 flex items-center justify-center shadow-lg transition-colors"
                style={{
                  backgroundColor: isSelected ? ORANGE_COLOR : '#9ca3af',
                }}
                onMouseOver={(e) => {
                  if (!pinClickCooldownRef.current) {
                    e.currentTarget.style.backgroundColor = ORANGE_COLOR;
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? ORANGE_COLOR : '#9ca3af';
                }}
              >
                <Pin size={14} />
              </button>
            </Tooltip>
          )}

          {/* Trash button (right) */}
          {onDelete && node.type !== 's' && (
            <Tooltip content="Delete node" position="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="bg-gray-400 hover:bg-red-600 text-white rounded w-5 h-5 flex items-center justify-center shadow-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* Persistent pin button - shown when node is probability root and not start node */}
      {isSelected && node.type !== 's' && onSetProbabilityRoot && !isNodeSelected && (
        <div
          className="absolute flex flex-row gap-1 z-10"
          style={{
            top: `${-23 - borderWidth}px`,
            right: `${-borderWidth}px`,
          }}
        >
          <Tooltip content="Remove as start" position="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                pinClickCooldownRef.current = true;
                onSetProbabilityRootHoverEnd?.(); // Clear hover state before toggling
                onSetProbabilityRoot();
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                if (!pinClickCooldownRef.current) {
                  onSetProbabilityRootHoverStart?.();
                }
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                pinClickCooldownRef.current = false; // Reset cooldown when mouse leaves
                onSetProbabilityRootHoverEnd?.();
              }}
              className="text-white rounded w-5 h-5 flex items-center justify-center shadow-lg transition-colors"
              style={{
                backgroundColor: ORANGE_COLOR,
              }}
            >
              <Pin size={14} />
            </button>
          </Tooltip>
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

      {/* Pop-up slider - uses CSS group-hover, always rendered for question nodes */}
      {showSlider && (
        <div
          className={`absolute pointer-events-auto transition-opacity duration-200 ${
            isNodeSelected || isSliderDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
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
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsSliderDragging(true);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                setIsSliderDragging(false);
                onSliderChangeComplete?.();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                setIsSliderDragging(false);
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

      {/* Add arrow buttons - shown on hover for eligible nodes */}
      {showAddArrows && onAddArrow && (() => {
        // Determine if this is an outcome node (has colored bubbles on the left)
        const isOutcomeNode = type === 'g' || type === 'a' || type === 'e';
        const offset = 10; // Distance from node edge in pixels
        const hoverPadding = 8; // Extra padding to bridge gap between node and button

        const allButtons = [
          {
            direction: 'top' as const,
            icon: ArrowUp,
            containerStyle: {
              position: 'absolute' as const,
              top: `${-offset}px`, // Adjust for padding and transform
              left: '50%',
              transform: 'translate(-50%, -50%)',
              paddingBottom: `${hoverPadding}px`, // Extend hover area toward node
            },
          },
          {
            direction: 'bottom' as const,
            icon: ArrowDown,
            containerStyle: {
              position: 'absolute' as const,
              bottom: `${-offset}px`, // Adjust for padding and transform
              left: '50%',
              transform: 'translate(-50%, 50%)',
              paddingTop: `${hoverPadding}px`, // Extend hover area toward node
            },
          },
          {
            direction: 'left' as const,
            icon: ArrowLeft,
            containerStyle: {
              position: 'absolute' as const,
              left: `${-offset}px`, // Adjust for padding and transform
              top: '50%',
              transform: 'translate(-50%, -50%)',
              paddingRight: `${hoverPadding}px`, // Extend hover area toward node
            },
          },
          {
            direction: 'right' as const,
            icon: ArrowRight,
            containerStyle: {
              position: 'absolute' as const,
              right: `${-offset}px`, // Adjust for padding and transform
              top: '50%',
              transform: 'translate(50%, -50%)',
              paddingLeft: `${hoverPadding}px`, // Extend hover area toward node
            },
          },
        ];

        // Filter out left arrow for SELECTED outcome nodes to avoid overlap with outcome type bubbles
        const buttons = (isOutcomeNode && isNodeSelected)
          ? allButtons.filter(btn => btn.direction !== 'left')
          : allButtons;

        return buttons.map(({ direction, icon: Icon, containerStyle }) => (
          <div
            key={direction}
            style={{
              ...containerStyle,
              zIndex: 1001,
              pointerEvents: 'auto',
            }}
            className={`${
              isNodeSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Tooltip content="Drag to add arrow" position={direction === 'bottom' ? 'bottom' : 'top'}>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddArrow(direction);
                }}
                className="bg-blue-500/30 hover:bg-blue-500/60 text-white rounded-full p-0.5 transition-all duration-200 hover:scale-110 border border-blue-400/50"
              >
                <Icon size={12} />
              </button>
            </Tooltip>
          </div>
        ));
      })()}
    </div>
  );
});

Node.displayName = 'Node';

export default Node;
