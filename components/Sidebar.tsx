'use client'
import { AUTHORS_ESTIMATES } from '@/lib/graphData';
import { SLIDER_DEFAULT_VALUE, type GraphData, type GraphNode, type Node, NodeType } from '@/lib/types';
import { decodeSliderValues } from '@/lib/urlState';
import Slider from './Slider';
import { AuthModal } from './auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  sliderValues: number[];
  minOpacity: number;
  hoveredNodeIndex: number;
  probabilityRootIndex: number;
  graphData: GraphData;
  nodes: Node[];
  authModalOpen: boolean;
  onAuthModalOpenChange: (open: boolean) => void;
  onSliderChange: (index: number, value: number) => void;
  onSliderChangeComplete: (index: number) => void;
  onMinOpacityChange: (value: number) => void;
  onSliderHover: (nodeIndex: number) => void;
  onSliderLeave: () => void;
  onResetSliders: () => void;
  onLoadAuthorsEstimates: () => void;
  onResetNodePositions: () => void;
}

export default function Sidebar({
  sliderValues,
  minOpacity,
  hoveredNodeIndex,
  probabilityRootIndex,
  graphData,
  nodes,
  authModalOpen,
  onAuthModalOpenChange,
  onSliderChange,
  onSliderChangeComplete,
  onMinOpacityChange,
  onSliderHover,
  onSliderLeave,
  onResetSliders,
  onLoadAuthorsEstimates,
  onResetNodePositions,
}: SidebarProps) {
  const { user, loading } = useAuth();

  // Dynamically compute question node indices from current graph data, sorted by sliderIndex
  // This ensures the sidebar stays in sync when nodes are converted (e.g., question -> intermediate)
  // and that sliders appear in the correct order based on their sliderIndex property
  const questionNodeIndices = graphData.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === NodeType.QUESTION)
    .sort((a, b) => (a.node.sliderIndex || 0) - (b.node.sliderIndex || 0))
    .map(({ index }) => index);

  return (
    <div className="w-96 h-screen overflow-y-auto bg-background border-r border-gray-800 p-6 flex-shrink-0">
      {/* Auth Section */}
      <div className="mb-6 pb-6 border-b border-gray-800">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
        ) : user ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Signed in as:</span>
              <button
                onClick={() => onAuthModalOpenChange(true)}
                className="text-sm text-purple-500 hover:text-purple-400"
              >
                Profile
              </button>
            </div>
            <div className="text-sm truncate">{user.email}</div>
          </div>
        ) : (
          <button
            onClick={() => onAuthModalOpenChange(true)}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-m text-sm transition-colors"
          >
            Sign In / Sign Up
          </button>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => onAuthModalOpenChange(false)}
        isAuthenticated={!!user}
      />

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
          {questionNodeIndices.map((nodeIndex, sliderIndex) => {
            const node = nodes[nodeIndex];
            const sliderValue = sliderValues[sliderIndex];

            // Skip if slider value doesn't exist yet (during state updates)
            if (sliderValue === undefined) return null;

            const isHighlighted = nodeIndex === hoveredNodeIndex || nodeIndex === probabilityRootIndex;

            return (
              <Slider
                key={nodeIndex}
                node={node}
                value={sliderValue}
                isHighlighted={isHighlighted}
                onChange={(value) => onSliderChange(sliderIndex, value)}
                onChangeComplete={() => onSliderChangeComplete(sliderIndex)}
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
