interface DragHintProps {
  isVisible: boolean;
  shiftHeld: boolean;
  cursorX: number;
  cursorY: number;
}

export default function DragHint({ isVisible }: DragHintProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed left-1/2 bottom-5 -translate-x-1/2 px-3 py-2 rounded-md z-[10000] pointer-events-none shadow-lg"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        Drag to reposition
      </div>
      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
        Hold <kbd
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            fontSize: '10px',
          }}
        >
          Shift
        </kbd> for precise positioning
      </div>
    </div>
  );
}
