"use client";

import { useState } from "react";
import { Node, NodeType, NODE_COLORS } from "@/lib/types";
import { X } from "lucide-react";

interface OutcomeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
}

export function OutcomeDetailModal({
  isOpen,
  onClose,
  nodes,
}: OutcomeDetailModalProps) {
  const [mouseDownOutside, setMouseDownOutside] = useState(false);

  if (!isOpen) return null;

  // Filter and categorize outcome nodes
  const goodOutcomes = nodes
    .filter((n) => n.type === NodeType.GOOD)
    .sort((a, b) => b.p - a.p); // Sort by probability descending

  const ambivalentOutcomes = nodes
    .filter((n) => n.type === NodeType.AMBIVALENT)
    .sort((a, b) => b.p - a.p);

  const existentialOutcomes = nodes
    .filter((n) => n.type === NodeType.EXISTENTIAL)
    .sort((a, b) => b.p - a.p);

  // Calculate totals
  const goodTotal = goodOutcomes.reduce((sum, n) => sum + n.p, 0);
  const ambivalentTotal = ambivalentOutcomes.reduce((sum, n) => sum + n.p, 0);
  const existentialTotal = existentialOutcomes.reduce((sum, n) => sum + n.p, 0);
  const grandTotal = goodTotal + ambivalentTotal + existentialTotal;

  const handleBackdropMouseDown = () => {
    setMouseDownOutside(true);
  };

  const handleBackdropMouseUp = () => {
    if (mouseDownOutside) {
      onClose();
    }
    setMouseDownOutside(false);
  };

  const renderCategoryBar = (
    outcomes: Node[],
    color: string,
    label: string
  ) => {
    const categoryTotal = outcomes.reduce((sum, n) => sum + n.p, 0);
    const heightPercent =
      grandTotal > 0 ? (categoryTotal / grandTotal) * 100 : 0;
    const categoryPercent = (categoryTotal * 100).toFixed(0);

    if (heightPercent === 0) return null;

    return (
      <div
        className="relative group"
        style={{
          height: `${heightPercent}%`,
          backgroundColor: color,
          filter: "saturate(0.7)",
        }}
        title={`${label}: ${categoryPercent}%`}
      >
        {heightPercent > 8 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-black">
            {label} - {categoryPercent}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 border border-gray-700"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">
            Outcome Distribution
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Large Bar Chart */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">
                Visual Distribution
              </h3>
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden flex flex-col min-h-[400px]">
                {/* Good outcomes */}
                {renderCategoryBar(
                  goodOutcomes,
                  NODE_COLORS.GOOD.border,
                  "Good"
                )}

                {/* Ambivalent outcomes */}
                {renderCategoryBar(
                  ambivalentOutcomes,
                  NODE_COLORS.AMBIVALENT.border,
                  "Ambivalent"
                )}

                {/* Existential outcomes */}
                {renderCategoryBar(
                  existentialOutcomes,
                  NODE_COLORS.EXISTENTIAL.border,
                  "Existential"
                )}
              </div>
            </div>

            {/* Right: Detailed List */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-white mb-4">
                Detailed Probabilities
              </h3>
              <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4">
                {/* Good Outcomes */}
                {goodOutcomes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-2">
                      Good Outcomes ({(goodTotal * 100).toFixed(0)}%)
                    </h4>
                    <div className="space-y-1">
                      {goodOutcomes.map((outcome) => (
                        <div
                          key={outcome.id}
                          className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm"
                        >
                          <span className="text-gray-300 flex-1">
                            {outcome.text}
                          </span>
                          <span className="text-green-400 font-medium ml-2">
                            {(outcome.p * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ambivalent Outcomes */}
                {ambivalentOutcomes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                      Ambivalent Outcomes ({(ambivalentTotal * 100).toFixed(0)}
                      %)
                    </h4>
                    <div className="space-y-1">
                      {ambivalentOutcomes.map((outcome) => (
                        <div
                          key={outcome.id}
                          className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm"
                        >
                          <span className="text-gray-300 flex-1">
                            {outcome.text}
                          </span>
                          <span className="text-yellow-400 font-medium ml-2">
                            {(outcome.p * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existential Outcomes */}
                {existentialOutcomes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-2">
                      Existential Outcomes (
                      {(existentialTotal * 100).toFixed(0)}%)
                    </h4>
                    <div className="space-y-1">
                      {existentialOutcomes.map((outcome) => (
                        <div
                          key={outcome.id}
                          className="flex items-center justify-between bg-gray-800 rounded px-3 py-2 text-sm"
                        >
                          <span className="text-gray-300 flex-1">
                            {outcome.text}
                          </span>
                          <span className="text-red-400 font-medium ml-2">
                            {(outcome.p * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            Total probability: {(grandTotal * 100).toFixed(2)}%
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
