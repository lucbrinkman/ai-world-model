interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: ZoomControlsProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-background border border-gray-800 rounded-lg p-2 shadow-lg flex flex-col gap-2 z-10">
      {/* Zoom In Button */}
      <button
        onClick={onZoomIn}
        disabled={zoom >= 200}
        className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-lg font-bold transition-colors"
        title="Zoom in (Ctrl/Cmd + Wheel)"
      >
        +
      </button>

      {/* Zoom Level Display */}
      <div className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-400">
        {Math.round(zoom)}%
      </div>

      {/* Zoom Out Button */}
      <button
        onClick={onZoomOut}
        disabled={zoom <= 25}
        className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-lg font-bold transition-colors"
        title="Zoom out (Ctrl/Cmd + Wheel)"
      >
        −
      </button>

      {/* Reset Button */}
      <div className="border-t border-gray-800 pt-2 mt-1">
        <button
          onClick={onReset}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium transition-colors"
          title="Reset zoom and position"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
