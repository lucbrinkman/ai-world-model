'use client'

import { useState } from 'react';
import { NODE_COLORS, type NodeType } from '@/lib/types';

interface OutcomeTypeSwitcherProps {
  nodeId: string;
  currentType: NodeType;
  onChangeType: (nodeId: string, newType: 'n' | 'g' | 'a' | 'e' | 'i') => void;
}

export default function OutcomeTypeSwitcher({
  nodeId,
  currentType,
  onChangeType,
}: OutcomeTypeSwitcherProps) {
  const [isHovered, setIsHovered] = useState(false);

  const outcomeTypes = [
    { type: 'g' as const, label: 'Good', color: NODE_COLORS.GOOD.border },
    { type: 'a' as const, label: 'Ambivalent', color: NODE_COLORS.AMBIVALENT.border },
    { type: 'e' as const, label: 'Bad', color: NODE_COLORS.EXISTENTIAL.border },
  ];

  return (
    <div
      className="absolute flex flex-col gap-2"
      style={{
        left: '-16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20,
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
          className="relative flex items-center justify-end transition-all duration-200 cursor-pointer"
          style={{
            width: isHovered ? '100px' : '10px',
            height: '10px',
            backgroundColor: color,
            borderRadius: isHovered ? '4px' : '50%',
            border: currentType === type ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.3)',
            opacity: currentType === type ? 1 : (isHovered ? 0.9 : 0.6),
            padding: isHovered ? '0 8px' : '0',
          }}
          title={label}
        >
          {isHovered && (
            <span
              className="text-xs font-medium whitespace-nowrap"
              style={{
                color: 'white',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
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
