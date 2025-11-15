import { Edge as EdgeType, EdgeType as ET, Node } from '@/lib/types';
import { calculateAlpha, calculateArrowWidth, calculateArrowHeadLength } from '@/lib/probability';

interface EdgeProps {
  edge: EdgeType;
  sourceNode: Node;
  targetNode: Node;
  sliderValue: number | null; // For displaying y= or n= label
  transparentPaths: boolean;
  boldPaths: boolean;
  minOpacity: number;
  sourceBounds?: DOMRect;
  targetBounds?: DOMRect;
}

export default function Edge({
  edge,
  sourceNode,
  targetNode,
  sliderValue,
  transparentPaths,
  boldPaths,
  minOpacity,
  sourceBounds,
  targetBounds,
}: EdgeProps) {
  const { p, yn } = edge;

  // Calculate opacity
  const opacity = calculateAlpha(p, transparentPaths, minOpacity, false);

  // Calculate arrow width and head length
  const arrowWidth = calculateArrowWidth(p, boldPaths);
  const headLen = calculateArrowHeadLength(p, boldPaths);

  // Get source and target positions (centers)
  let x1 = sourceNode.x;
  let y1 = sourceNode.y;
  let x2 = targetNode.x;
  let y2 = targetNode.y;

  // Use actual bounds if available, otherwise fall back to estimates
  const sourceWidth = sourceBounds?.width ?? 145;
  const sourceHeight = sourceBounds?.height ?? 55;
  const targetWidth = targetBounds?.width ?? 145;
  const targetHeight = targetBounds?.height ?? 55;

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

  // Calculate label position and rotation
  const NODE_LABEL_POSITION_FACTOR = 0.38;
  let labelDx = dy;
  let labelDy = -dx;
  const norm = Math.sqrt(labelDx * labelDx + labelDy * labelDy);
  const offset = 12;
  const flipSign = labelDy > 0;
  labelDx = (labelDx / norm) * offset * (flipSign ? -1 : 1);
  labelDy = (labelDy / norm) * offset * (flipSign ? -1 : 1);
  const labelAngle = Math.atan2(dy, dx) + (flipSign ? Math.PI : 0);
  const labelX = labelDx + x1 + dx * NODE_LABEL_POSITION_FACTOR;
  const labelY = labelDy + y1 + dy * NODE_LABEL_POSITION_FACTOR;

  // Calculate label text
  let labelText = '';
  if (yn !== ET.E100) {
    const label = yn === ET.YES ? 'y' : 'n';
    const value = yn === ET.YES ? sliderValue : (sliderValue !== null ? 100 - sliderValue : null);
    if (value !== null) {
      labelText = `${label}=${value}`;
    }
  }

  return (
    <g>
      {/* Arrow line */}
      <line
        x1={x1}
        y1={y1}
        x2={lineEndX}
        y2={lineEndY}
        stroke={color}
        strokeWidth={arrowWidth}
      />

      {/* Arrow head */}
      <polygon
        points={`${x2},${y2} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
        fill={color}
      />

      {/* Edge label */}
      {labelText && (
        <text
          x={labelX}
          y={labelY}
          fill="white"
          fontSize="10"
          fontWeight={400}
          opacity={opacity}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${(labelAngle * 180) / Math.PI} ${labelX} ${labelY})`}
        >
          {labelText}
        </text>
      )}
    </g>
  );
}
