import { Node as NodeType, NodeType as NT, NODE_COLORS } from '@/lib/types';
import { toPercentString, calculateAlpha, calculateNodeBorderWidth } from '@/lib/probability';
import { forwardRef } from 'react';

interface NodeProps {
  node: NodeType;
  isSelected: boolean;
  isHovered: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const Node = forwardRef<HTMLDivElement, NodeProps>(({
  node,
  isSelected,
  isHovered,
  transparentPaths,
  minOpacity,
  onClick,
  onMouseEnter,
  onMouseLeave,
}, ref) => {
  const { x, y, text, p, type } = node;

  // Calculate opacity
  const opacity = calculateAlpha(p, transparentPaths, minOpacity, isSelected || isHovered);

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

  // Format text (replace | with line breaks)
  const formattedText = text.replace(/\|/g, '\n');
  const lines = formattedText.split('\n');

  // Calculate percent display
  const percent = Math.round(p * 100);

  // Corner radius for top-left (shared between node and badge)
  const topLeftRadius = '8px';

  return (
    <div  // Node container
      ref={ref}
      className="absolute border-solid cursor-pointer transition-all duration-200 px-1.5 py-0.5"
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
      }}
      onClick={onClick}
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
