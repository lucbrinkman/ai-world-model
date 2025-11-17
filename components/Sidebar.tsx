'use client'
import { AUTHORS_ESTIMATES } from '@/lib/graphData';
import { type GraphData, type GraphNode, type Node, NodeType } from '@/lib/types';
import Slider from './Slider';

interface SidebarProps {
  minOpacity: number;
  hoveredNodeIndex: number;
  probabilityRootIndex: number;
  graphData: GraphData;
  nodes: Node[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSliderChange: (nodeId: string, value: number) => void;
  onSliderChangeComplete: (nodeId: string) => void;
  onMinOpacityChange: (value: number) => void;
  onSliderHover: (nodeIndex: number) => void;
  onSliderLeave: () => void;
  onResetSliders: () => void;
  onLoadAuthorsEstimates: () => void;
  onResetNodePositions: () => void;
}

export default function Sidebar({
  minOpacity,
  hoveredNodeIndex,
  probabilityRootIndex,
  graphData,
  nodes,
  isCollapsed,
  onToggleCollapse,
  onSliderChange,
  onSliderChangeComplete,
  onMinOpacityChange,
  onSliderHover,
  onSliderLeave,
  onResetSliders,
  onLoadAuthorsEstimates,
  onResetNodePositions,
}: SidebarProps) {

  // Dynamically compute question node indices from current graph data, sorted by sliderIndex
  // This ensures the sidebar stays in sync when nodes are converted (e.g., question -> intermediate)
  // and that sliders appear in the correct order based on their sliderIndex property
  const questionNodeIndices = graphData.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === NodeType.QUESTION)
    .sort((a, b) => (a.node.sliderIndex || 0) - (b.node.sliderIndex || 0))
    .map(({ index }) => index);

  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-[125px] h-screen z-10">
        <button
          onClick={onToggleCollapse}
          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-r-md border-r border-t border-b border-gray-700 transition-colors"
          aria-label="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-96 h-screen overflow-y-auto bg-background border-r border-gray-800 p-6 flex-shrink-0 transition-all duration-300">
      {/* Collapse Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="Collapse sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Options Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Options</h2>

        {/* Transparent paths slider */}
        <div className="mb-3">
          <div className="mb-2">
            <span className="text-sm">Make less likely paths transparent</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={100 - minOpacity}
              onChange={(e) => onMinOpacityChange(100 - parseInt(e.target.value))}
              className="w-48 h-2 rounded-full cursor-pointer appearance-none"
              style={{ accentColor: '#1E90FF' }}
            />
            <span className="text-sm text-gray-400 font-mono w-12">
              {minOpacity === 100 ? 'Off' : `${100 - minOpacity}%`}
            </span>
          </div>
        </div>

        {/* Reset node positions button */}
        <div className="mt-4">
          <button
            onClick={onResetNodePositions}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
          >
            Reset Node Positions
          </button>
          <p className="text-xs text-gray-400 mt-1">Drag nodes to reposition them</p>
        </div>
      </div>

      {/* Conditional Probabilities Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Conditional Probabilities</h2>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={onResetSliders}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
          >
            Reset to 50%
          </button>
          <button
            onClick={onLoadAuthorsEstimates}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
          >
            Author's estimates
          </button>
        </div>

        {/* Sliders */}
        <div>
          {questionNodeIndices.map((nodeIndex) => {
            const node = nodes[nodeIndex];
            const graphNode = graphData.nodes.find(n => n.id === node.id);

            // Skip if no probability value exists yet
            if (!graphNode || graphNode.probability === null || graphNode.probability === undefined) return null;

            const isHighlighted = nodeIndex === hoveredNodeIndex || nodeIndex === probabilityRootIndex;

            return (
              <Slider
                key={nodeIndex}
                node={node}
                value={graphNode.probability}
                isHighlighted={isHighlighted}
                onChange={(value) => onSliderChange(graphNode.id, value)}
                onChangeComplete={() => onSliderChangeComplete(graphNode.id)}
                onMouseEnter={() => onSliderHover(nodeIndex)}
                onMouseLeave={onSliderLeave}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
