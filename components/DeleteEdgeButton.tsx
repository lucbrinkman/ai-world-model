import { X } from 'lucide-react';

interface DeleteEdgeButtonProps {
  edgeIndex: number;
  sourceNodeTitle: string;
  position: { x: number; y: number };
  onDelete: () => void;
}

export default function DeleteEdgeButton({
  edgeIndex,
  sourceNodeTitle,
  position,
  onDelete,
}: DeleteEdgeButtonProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-30%, -100%)',
        zIndex: 150,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-all duration-200 hover:scale-110"
        title="Delete connection"
      >
        <X size={9} />
      </button>
    </div>
  );
}
