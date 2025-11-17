'use client'

import { useState } from 'react';
import { NODE_COLORS, type NodeType } from '@/lib/types';

interface OutcomeTypeSwitcherProps {
  nodeId: string;
  currentType: NodeType;
  isSelected: boolean;
  onChangeType: (nodeId: string, newType: 'n' | 'g' | 'a' | 'e' | 'i') => void;
}

export default function OutcomeTypeSwitcher({
  nodeId,
  currentType,
  isSelected,
  onChangeType,
}: OutcomeTypeSwitcherProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Only show when node is selected
  if (!isSelected) return null;

  const outcomeTypes = [
    { type: 'g' as const, label: 'Good', color: NODE_COLORS.GOOD.border },
    { type: 'a' as const, label: 'Ambivalent', color: NODE_COLORS.AMBIVALENT.border },
    { type: 'e' as const, label: 'Bad', color: NODE_COLORS.EXISTENTIAL.border },
  ];

  return (
    <div
      className="absolute flex flex-col gap-2"
      style={{
        right: 'calc(100% + 10px)', // Anchor right edge 10px to the left of the node
        top: '50%',
        transform: 'translateY(-50%)',
        width: isHovered ? '70px' : '11px', // Parent expands leftward
        zIndex: 20,
        transition: 'width 200ms ease-in-out', // Only transition width
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => e.stopPropagation()}
    >
      {outcomeTypes.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={(e) => {
            e.stopPropagation();
            onChangeType(nodeId, type);
          }}
          className="flex items-center justify-end cursor-pointer"
          style={{
            width: '100%', // Fill parent
            height: '11px',
            backgroundColor: color,
            borderRadius: isHovered ? '4px' : '50%',
            border: currentType === type ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.3)',
            opacity: currentType === type ? 1 : (isHovered ? 0.9 : 0.6),
            padding: isHovered ? '0 8px' : '0',
            transition: 'border-radius 200ms ease-in-out, opacity 200ms ease-in-out, padding 200ms ease-in-out',
          }}
          title={label}
        >
          {isHovered && (
            <span
              className="font-medium whitespace-nowrap"
              style={{
                fontSize: '10px',
                color: type === 'e' ? 'white' : 'black', // Black for Good/Ambivalent, white for Bad
                textShadow: type === 'e' ? '0 1px 2px rgba(0, 0, 0, 0.8)' : 'none',
              }}
            >
              {label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
