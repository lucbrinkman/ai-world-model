import React, { useState } from "react";
import { NODE_COLORS, Node } from "@/lib/types";
import { OutcomeDetailModal } from "./OutcomeDetailModal";
import Tooltip from "./Tooltip";

interface OutcomeBarGraphProps {
  existentialProbability: number;
  ambivalentProbability: number;
  goodProbability: number;
  nodes: Node[];
}

export default function OutcomeBarGraph({
  existentialProbability,
  ambivalentProbability,
  goodProbability,
  nodes,
}: OutcomeBarGraphProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const total =
    existentialProbability + ambivalentProbability + goodProbability;

  // Calculate percentages (normalize to 100% if there's any probability)
  const existentialPercent =
    total > 0 ? (existentialProbability / total) * 100 : 0;
  const ambivalentPercent =
    total > 0 ? (ambivalentProbability / total) * 100 : 0;
  const goodPercent = total > 0 ? (goodProbability / total) * 100 : 0;

  const tooltipContent = `Good: ${goodPercent.toFixed(1)}% | Ambivalent: ${ambivalentPercent.toFixed(1)}% | Existential: ${existentialPercent.toFixed(1)}%`;

  return (
    <>
      <Tooltip content={tooltipContent} position="left">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-32 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col hover:border-gray-600 transition-colors cursor-pointer"
        >
          {/* Good outcomes (top) */}
          {goodPercent > 0 && (
            <div
              className="relative group"
              style={{
                height: `${goodPercent}%`,
                backgroundColor: NODE_COLORS.GOOD.border,
                filter: "saturate(0.7)",
              }}
            >
              {goodPercent > 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-black">
                  {goodPercent.toFixed(0)}
                </span>
              )}
            </div>
          )}

          {/* Ambivalent outcomes (middle) */}
          {ambivalentPercent > 0 && (
            <div
              className="relative group"
              style={{
                height: `${ambivalentPercent}%`,
                backgroundColor: NODE_COLORS.AMBIVALENT.border,
                filter: "saturate(0.7)",
              }}
            >
              {ambivalentPercent > 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-black">
                  {ambivalentPercent.toFixed(0)}
                </span>
              )}
            </div>
          )}

          {/* Existential outcomes (bottom) */}
          {existentialPercent > 0 && (
            <div
              className="relative group"
              style={{
                height: `${existentialPercent}%`,
                backgroundColor: NODE_COLORS.EXISTENTIAL.border,
                filter: "saturate(0.7)",
              }}
            >
              {existentialPercent > 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-black">
                  {existentialPercent.toFixed(0)}
                </span>
              )}
            </div>
          )}
        </button>
      </Tooltip>

      <OutcomeDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        nodes={nodes}
      />
    </>
  );
}
