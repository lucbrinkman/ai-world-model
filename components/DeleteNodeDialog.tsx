import React from 'react';

interface DeleteNodeDialogProps {
  isOpen: boolean;
  nodeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteNodeDialog({
  isOpen,
  nodeTitle,
  onConfirm,
  onCancel,
}: DeleteNodeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Delete Node</h2>
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete &quot;{nodeTitle}&quot;?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
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
