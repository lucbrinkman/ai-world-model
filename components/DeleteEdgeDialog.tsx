import React from 'react';

interface DeleteEdgeDialogProps {
  isOpen: boolean;
  sourceNodeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteEdgeDialog({
  isOpen,
  sourceNodeTitle,
  onConfirm,
  onCancel,
}: DeleteEdgeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-3 text-white">Delete Connection</h2>
        <p className="text-gray-300 mb-5">
          Delete connection and convert &quot;{sourceNodeTitle}&quot; from question to intermediate outcome?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
