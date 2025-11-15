import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Node, NODE_COLORS } from '@/lib/types';

interface SliderProps {
  node: Node;
  value: number;
  isHighlighted: boolean;
  onChange: (value: number) => void;
  onChangeComplete: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function Slider({
  node,
  value,
  isHighlighted,
  onChange,
  onChangeComplete,
  onMouseEnter,
  onMouseLeave,
}: SliderProps) {
  // Use local state for immediate visual feedback
  const [localValue, setLocalValue] = useState(value);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef(0);

  // Sync local value with prop value when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    lastUpdateTimeRef.current = 0; // Reset to allow immediate first update
  };

  const throttledOnChange = useCallback((newValue: number) => {
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // Throttle to ~16ms (60fps) for smooth updates without overwhelming React
    if (timeSinceLastUpdate >= 16) {
      lastUpdateTimeRef.current = now;
      onChange(newValue);
    } else {
      // Schedule an update for the next frame if we're being called too rapidly
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        lastUpdateTimeRef.current = performance.now();
        onChange(newValue);
        rafIdRef.current = null;
      });
    }
  }, [onChange]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocalValue(newValue);

    if (isDraggingRef.current) {
      // Update parent with throttling for real-time feedback
      throttledOnChange(newValue);
    } else {
      // If not dragging (e.g., keyboard input), update immediately
      onChange(newValue);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    // Final update to ensure we have the exact final value
    onChange(localValue);
    onChangeComplete();
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    onChange(localValue);
    onChangeComplete();
  };

  const highlightColor = isHighlighted
    ? NODE_COLORS.QUESTION.hover
    : 'rgba(255, 255, 255, 0.05)';

  const textColor = isHighlighted
    ? NODE_COLORS.QUESTION.hover
    : 'white';

  const numberColor = isHighlighted
    ? NODE_COLORS.QUESTION.hover
    : 'rgba(255, 255, 255, 0.6)';

  const accentColor = isHighlighted
    ? NODE_COLORS.QUESTION.hover
    : '#1E90FF';

  // Format the question text
  const questionText = node.text.trim();

  // Format the percent display - use localValue for immediate feedback
  const percentString = localValue.toString().padStart(3, '\u00A0');

  return (
    <div
      className="border border-solid rounded-m p-3 mb-2 transition-all duration-200"
      style={{
        borderColor: highlightColor,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Question label */}
      <div
        className="text-sm mb-2"
        style={{
          color: textColor,
        }}
      >
        {questionText}
      </div>

      {/* Slider and percentage */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          value={localValue}
          onMouseDown={handleMouseDown}
          onInput={handleInput}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleTouchEnd}
          className="flex-1 h-2 rounded-full cursor-pointer appearance-none slider-thumb"
          style={{
            accentColor: accentColor,
          }}
        />
        <div
          className="text-sm font-mono w-20 text-right"
          style={{
            color: numberColor,
          }}
        >
          y={percentString}%
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when props haven't changed
export default memo(Slider);
