'use client';

import { useState, useRef, ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 350,
  disabled = false,
}: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerEnter = () => {
    if (disabled) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, delay);
  };

  const handlePointerLeave = () => {
    setShowTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    setShowTooltip(true);
  };

  const handleBlur = () => {
    setShowTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Position classes for the tooltip
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {showTooltip && content && (
        <div
          className={`
            absolute z-50 px-2 py-1
            bg-gray-900 text-white text-sm rounded shadow-lg
            whitespace-nowrap pointer-events-none
            ${positionClasses[position]}
          `}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
