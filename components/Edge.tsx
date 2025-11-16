import { Edge as EdgeType, EdgeType as ET, Node } from '@/lib/types';
import { calculateAlpha, calculateArrowWidth, calculateArrowHeadLength } from '@/lib/probability';
import { useRef, useEffect, useState } from 'react';

interface EdgeProps {
  edge: EdgeType;
  edgeIndex: number;
  sourceNode: Node;
  targetNode?: Node; // Optional for floating endpoints
  sliderValue: number | null; // For displaying y= or n= label
  transparentPaths: boolean;
  boldPaths: boolean;
  minOpacity: number;
  maxOutcomeProbability: number;
  sourceBounds?: DOMRect;
  targetBounds?: DOMRect;
  isSelected: boolean;
  onClick?: () => void;
  onLabelUpdate?: (edgeIndex: number, newLabel: string) => void;
  onEditorClose?: () => void;
  previewTargetNode?: Node | null;
  previewTargetBounds?: DOMRect;
  previewFloatingPos?: { x: number; y: number } | null;
}

export default function Edge({
  edge,
  edgeIndex,
  sourceNode,
  targetNode,
  sliderValue,
  transparentPaths,
  boldPaths,
  minOpacity,
  maxOutcomeProbability,
  sourceBounds,
  targetBounds,
  isSelected,
  onClick,
  onLabelUpdate,
  onEditorClose,
  previewTargetNode,
  previewTargetBounds,
  previewFloatingPos,
}: EdgeProps) {
  const { p, yn } = edge;

  // Refs for measuring text
  const descriptionRef = useRef<SVGTextElement>(null);
  const percentRef = useRef<SVGTextElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [boxDimensions, setBoxDimensions] = useState({ width: 84, height: 30 });

  // Label editing state
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelText, setEditLabelText] = useState(edge.label || '');


  // Calculate opacity
  const opacity = calculateAlpha(p, transparentPaths, minOpacity, false, maxOutcomeProbability);

  // Calculate arrow width and head length
  const arrowWidth = calculateArrowWidth(p, boldPaths);
  const headLen = calculateArrowHeadLength(p, boldPaths);

  // Get source and target positions (centers)
  // Use preview values if dragging, otherwise use actual target

  let x1 = sourceBounds ? sourceBounds.x + sourceBounds.width / 2 : sourceNode.x;
  let y1 = sourceBounds ? sourceBounds.y + sourceBounds.height / 2 : sourceNode.y;

  // Calculate target position - use preview if available
  let x2: number;
  let y2: number;
  let effectiveTargetNode: Node | undefined;
  let effectiveTargetBounds: DOMRect | undefined;

  if (previewFloatingPos) {
    // Preview floating position while dragging
    x2 = previewFloatingPos.x;
    y2 = previewFloatingPos.y;
    effectiveTargetNode = undefined;
    effectiveTargetBounds = undefined;
  } else if (previewTargetNode) {
    // Preview node target while dragging
    effectiveTargetNode = previewTargetNode;
    effectiveTargetBounds = previewTargetBounds;
    x2 = effectiveTargetBounds ? effectiveTargetBounds.x + effectiveTargetBounds.width / 2 : effectiveTargetNode.x;
    y2 = effectiveTargetBounds ? effectiveTargetBounds.y + effectiveTargetBounds.height / 2 : effectiveTargetNode.y;
  } else if (targetNode) {
    // Normal target node
    effectiveTargetNode = targetNode;
    effectiveTargetBounds = targetBounds;
    x2 = targetBounds ? targetBounds.x + targetBounds.width / 2 : targetNode.x;
    y2 = targetBounds ? targetBounds.y + targetBounds.height / 2 : targetNode.y;
  } else {
    // Floating endpoint - use coordinates from edge
    effectiveTargetNode = undefined;
    effectiveTargetBounds = undefined;
    x2 = edge.targetX ?? 0;
    y2 = edge.targetY ?? 0;
  }

  // Use actual bounds if available, otherwise fall back to estimates
  const sourceWidth = sourceBounds?.width ?? 145;
  const sourceHeight = sourceBounds?.height ?? 55;
  // For floating endpoints, target has no width/height (it's just a point)
  const targetWidth = effectiveTargetNode ? (effectiveTargetBounds?.width ?? 145) : 0;
  const targetHeight = effectiveTargetNode ? (effectiveTargetBounds?.height ?? 55) : 0;

  // Calculate initial dx, dy
  let dx = x2 - x1;
  let dy = y2 - y1;

  // Adjust arrow start point to align with box edges (from original v4.html lines 755-764)
  // Make arrow endpoints align with mid-line or corner points of the boxes
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

  // Adjust arrow end point to align with target box edges
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

  // Small adjustments for pixel-perfect alignment (from original)
  x1 -= 1;
  x2 -= 1;
  y1 -= 1;
  y2 -= 1;

  // Recalculate dx, dy with adjusted positions
  dx = x2 - x1;
  dy = y2 - y1;

  // Arrow color
  const color = `rgba(30, 144, 255, ${opacity})`;

  // Calculate arrow path
  const dlen = Math.sqrt(dx * dx + dy * dy);
  const headDx = (dx / dlen) * headLen * 0.866;
  const headDy = (dy / dlen) * headLen * 0.866;

  // Retract the line end so it doesn't overlap arrow head
  const lineEndX = x2 - headDx;
  const lineEndY = y2 - headDy;

  // Calculate arrowhead points
  const angle = Math.atan2(dy, dx);
  const arrowPoint1X = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const arrowPoint1Y = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const arrowPoint2X = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const arrowPoint2Y = y2 - headLen * Math.sin(angle + Math.PI / 6);

  // Calculate label position at center of arrow
  const NODE_LABEL_POSITION_FACTOR = 0.5; // Center of arrow is 0.5.
  const labelX = x1 + dx * NODE_LABEL_POSITION_FACTOR;
  const labelY = y1 + dy * NODE_LABEL_POSITION_FACTOR;

  // Calculate label text
  let labelText = '';
  let labelDescription = '';
  if (yn !== ET.E100) {
    const value = yn === ET.YES ? sliderValue : (sliderValue !== null ? 100 - sliderValue : null);
    if (value !== null) {
      // Get descriptive label from edge data
      if (edge.label) {
        labelDescription = edge.label;
        labelText = `${value}%`;
      } else {
        // Fallback to old format if no label is defined
        const label = yn === ET.YES ? 'y' : 'n';
        labelText = `${label}=${value}`;
      }
    }
  }

  // Measure text and update box dimensions
  useEffect(() => {
    if (descriptionRef.current && percentRef.current) {
      const descBBox = descriptionRef.current.getBBox();
      const percentBBox = percentRef.current.getBBox();

      // Get the maximum width and total height
      const maxWidth = Math.max(descBBox.width, percentBBox.width);
      const totalHeight = descBBox.height + percentBBox.height;

      // Add padding: 10px horizontal (5px each side), 8px vertical (4px each side)
      const newWidth = maxWidth + 0;
      const newHeight = totalHeight + 2;

      setBoxDimensions({ width: newWidth, height: newHeight });
    }
  }, [labelDescription, labelText]);

  // Update edit text when edge label changes
  useEffect(() => {
    setEditLabelText(edge.label || '');
  }, [edge.label]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditingLabel && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingLabel]);

  // Handle click outside to save edits
  useEffect(() => {
    if (!isEditingLabel) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (editInputRef.current && !editInputRef.current.contains(e.target as globalThis.Node)) {
        const newText = editLabelText.trim();
        if (newText && newText !== edge.label && onLabelUpdate) {
          onLabelUpdate(edgeIndex, newText);
        }
        setIsEditingLabel(false);
        onEditorClose?.();
      }
    };

    // Use mousedown instead of click to catch the event before blur
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingLabel, editLabelText, edge.label, onLabelUpdate, edgeIndex, onEditorClose]);

  const boxX = labelX - boxDimensions.width / 2;
  const boxY = labelY - boxDimensions.height / 2;

  // Handle double-click to edit label
  const handleLabelDoubleClick = (e: React.MouseEvent) => {
    if (onLabelUpdate) {
      e.stopPropagation();
      setIsEditingLabel(true);
    }
  };

  // Handle click on label (for edge selection)
  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick && !isEditingLabel) {
      onClick();
    }
  };

  // Save label edit
  const saveLabelEdit = () => {
    const newText = editLabelText.trim();
    if (newText && newText !== edge.label && onLabelUpdate) {
      onLabelUpdate(edgeIndex, newText);
    }
    setIsEditingLabel(false);
    onEditorClose?.();
  };

  // Handle label editing keyboard events
  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveLabelEdit();
    } else if (e.key === 'Escape') {
      setIsEditingLabel(false);
      setEditLabelText(edge.label || '');
      onEditorClose?.();
    }
  };


  // Handle arrow click
  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <g>
      {/* Invisible wider hitbox for easier clicking */}
      <line
        x1={x1}
        y1={y1}
        x2={lineEndX}
        y2={lineEndY}
        stroke="transparent"
        strokeWidth={Math.max(arrowWidth + 10, 15)}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={handleArrowClick}
      />

      {/* Arrow line */}
      <line
        x1={x1}
        y1={y1}
        x2={lineEndX}
        y2={lineEndY}
        stroke={color}
        strokeWidth={arrowWidth}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={handleArrowClick}
      />

      {/* Arrow head */}
      <polygon
        points={`${x2},${y2} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
        fill={color}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        onClick={handleArrowClick}
      />


      {/* Edge label */}
      {labelText && labelDescription && (
        <g>
          {/* Background rectangle to create interrupting effect */}
          <rect
            x={boxX}
            y={boxY}
            width={boxDimensions.width}
            height={boxDimensions.height}
            fill={isSelected ? "#1E90FF" : "#0C0A16"}
            opacity={isSelected ? 0.3 : 0.95}
            rx={3}
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onClick={handleLabelClick}
            onDoubleClick={handleLabelDoubleClick}
          />
          {/* Selection border */}
          {isSelected && (
            <rect
              x={boxX}
              y={boxY}
              width={boxDimensions.width}
              height={boxDimensions.height}
              fill="none"
              stroke="#1E90FF"
              strokeWidth="2"
              rx={3}
              style={{ pointerEvents: 'none' }}
            />
          )}
          {!isEditingLabel ? (
            <>
              {/* Description text */}
              <text
                ref={descriptionRef}
                x={labelX}
                y={labelY - 7}
                fill="white"
                fontSize="11"
                fontWeight={500}
                opacity={opacity}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={handleLabelClick}
                onDoubleClick={handleLabelDoubleClick}
              >
                {labelDescription}
              </text>
              {/* Percentage text */}
              <text
                ref={percentRef}
                x={labelX}
                y={labelY + 7}
                fill="white"
                fontSize="11"
                fontWeight={400}
                opacity={opacity}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={handleLabelClick}
                onDoubleClick={handleLabelDoubleClick}
              >
                {labelText}
              </text>
            </>
          ) : (
            <foreignObject
              x={boxX}
              y={boxY}
              width={boxDimensions.width}
              height={boxDimensions.height}
            >
              <input
                ref={editInputRef}
                type="text"
                value={editLabelText}
                onChange={(e) => setEditLabelText(e.target.value)}
                onBlur={saveLabelEdit}
                onKeyDown={handleLabelKeyDown}
                className="w-full h-full bg-transparent text-white text-xs text-center outline-none"
                style={{ fontSize: '11px', fontWeight: 500 }}
                onClick={(e) => e.stopPropagation()}
              />
            </foreignObject>
          )}
        </g>
      )}
      {/* Fallback for edges without descriptions (e.g., E100) */}
      {labelText && !labelDescription && (
        <text
          x={labelX}
          y={labelY}
          fill="white"
          fontSize="10"
          fontWeight={400}
          opacity={opacity}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${(angle * 180) / Math.PI} ${labelX} ${labelY})`}
        >
          {labelText}
        </text>
      )}
    </g>
  );
}
