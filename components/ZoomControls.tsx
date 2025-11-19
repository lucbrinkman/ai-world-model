import { MIN_ZOOM, MAX_ZOOM } from '@/lib/types';
import Tooltip from './Tooltip';
import { useModifierKey } from '@/hooks/useKeyboardShortcut';
import { Locate, Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ZoomControlsProps) {
  const modKey = useModifierKey();
  return (
    <div className="fixed bottom-6 right-6 bg-background border border-gray-800 rounded-lg p-2 shadow-lg flex flex-col gap-2 z-10">
      {/* Redo Button */}
      <Tooltip content={`Redo (${modKey}+Y)`} position="left">
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>
      </Tooltip>

      {/* Undo Button */}
      <Tooltip content={`Undo (${modKey}+Z)`} position="left">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </Tooltip>

      {/* Divider */}
      <div className="border-t border-gray-800"></div>

      {/* Zoom In Button */}
      <Tooltip content={`Zoom in (${modKey} + Wheel)`} position="left">
        <button
          onClick={onZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
        >
          <Plus size={20} />
        </button>
      </Tooltip>

      {/* Zoom Level Display */}
      <div className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-400">
        {Math.round(zoom)}%
      </div>

      {/* Zoom Out Button */}
      <Tooltip content={`Zoom out (${modKey} + Wheel)`} position="left">
        <button
          onClick={onZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded transition-colors"
        >
          <Minus size={20} />
        </button>
      </Tooltip>

      {/* Reset Button */}
      <div className="border-t border-gray-800 pt-2 mt-1">
        <Tooltip content="Reset zoom and position" position="left">
          <button
            onClick={onReset}
            className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium transition-colors"
          >
            <Locate size={20} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
