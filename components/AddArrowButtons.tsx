import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import Tooltip from './Tooltip';

interface AddArrowButtonsProps {
  nodeId: string;
  nodeType: string;
  nodeBounds: DOMRect;
  onAddArrow: (direction: 'top' | 'bottom' | 'left' | 'right') => void;
}

export default function AddArrowButtons({
  nodeId,
  nodeType,
  nodeBounds,
  onAddArrow,
}: AddArrowButtonsProps) {
  const centerX = nodeBounds.x + nodeBounds.width / 2;
  const centerY = nodeBounds.y + nodeBounds.height / 2;
  const offset = 15; // Distance from node edge

  // Determine if this is an outcome node (has colored bubbles on the left)
  const isOutcomeNode = nodeType === 'g' || nodeType === 'a' || nodeType === 'e';

  const allButtons = [
    {
      direction: 'top' as const,
      icon: ArrowUp,
      x: centerX,
      y: nodeBounds.y - offset,
    },
    {
      direction: 'bottom' as const,
      icon: ArrowDown,
      x: centerX,
      y: nodeBounds.y + nodeBounds.height + offset,
    },
    {
      direction: 'left' as const,
      icon: ArrowLeft,
      x: nodeBounds.x - offset,
      y: centerY,
    },
    {
      direction: 'right' as const,
      icon: ArrowRight,
      x: nodeBounds.x + nodeBounds.width + offset,
      y: centerY,
    },
  ];

  // Filter out left arrow for outcome nodes to avoid overlap with outcome type bubbles
  const buttons = isOutcomeNode
    ? allButtons.filter(btn => btn.direction !== 'left')
    : allButtons;

  const handleClick = (e: React.MouseEvent, direction: 'top' | 'bottom' | 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    onAddArrow(direction);
  };

  return (
    <>
      {buttons.map(({ direction, icon: Icon, x, y }) => (
        <Tooltip key={direction} content="Drag to add arrow" position={direction === 'bottom' ? 'bottom' : 'top'}>
          <button
            onClick={(e) => handleClick(e, direction)}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
            }}
            className="bg-blue-500/30 hover:bg-blue-500/60 text-white rounded-full p-0.5 transition-all duration-200 hover:scale-110 border border-blue-400/50"
          >
            <Icon size={12} />
          </button>
        </Tooltip>
      ))}
    </>
  );
}
