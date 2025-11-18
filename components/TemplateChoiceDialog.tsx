import React from 'react';

interface TemplateChoiceDialogProps {
  isOpen: boolean;
  onChooseTemplate: () => void;
  onChooseEmpty: () => void;
  onCancel: () => void;
}

export default function TemplateChoiceDialog({
  isOpen,
  onChooseTemplate,
  onChooseEmpty,
  onCancel,
}: TemplateChoiceDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-3 text-white">Create New Document</h2>
        <p className="text-gray-300 mb-6">
          Choose how you want to start your new document:
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onChooseTemplate}
            className="w-full px-6 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-left"
          >
            <div className="font-semibold mb-1">Start with Template</div>
            <div className="text-sm text-blue-100">
              Load the full AI futures map with 21 questions and outcomes
            </div>
          </button>
          <button
            onClick={onChooseEmpty}
            className="w-full px-6 py-4 text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
          >
            <div className="font-semibold mb-1">Start with Empty Page</div>
            <div className="text-sm text-gray-300">
              Begin with a blank canvas containing only a start node
            </div>
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
