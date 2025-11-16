'use client';

import { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onAddNode: () => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, onAddNode, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 z-50"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        onClick={() => {
          onAddNode();
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors"
      >
        Add Node
      </button>
    </div>
  );
}
