'use client'
import { nodes, questionNodeIndices, AUTHORS_ESTIMATES } from '@/lib/graphData';
import { SLIDER_DEFAULT_VALUE, type GraphData, type GraphNode } from '@/lib/types';
import { decodeSliderValues } from '@/lib/urlState';
import Slider from './Slider';
import { AuthModal } from './auth/AuthModal';
import ConnectionEditor from './ConnectionEditor';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  sliderValues: number[];
  boldPaths: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  hoveredNodeIndex: number;
  selectedNodeIndex: number;
  graphData: GraphData;
  authModalOpen: boolean;
  onAuthModalOpenChange: (open: boolean) => void;
  onSliderChange: (index: number, value: number) => void;
  onSliderChangeComplete: (index: number) => void;
  onBoldPathsChange: (value: boolean) => void;
  onTransparentPathsChange: (value: boolean) => void;
  onMinOpacityChange: (value: number) => void;
  onSliderHover: (nodeIndex: number) => void;
  onSliderLeave: () => void;
  onResetSliders: () => void;
  onLoadAuthorsEstimates: () => void;
  onUndo: () => void;
  onResetNodePositions: () => void;
  onUpdateConnectionLabel: (nodeId: string, connectionIndex: number, newLabel: string) => void;
  onUpdateConnectionTarget: (nodeId: string, connectionIndex: number, newTargetId: string) => void;
}

export default function Sidebar({
  sliderValues,
  boldPaths,
  transparentPaths,
  minOpacity,
  hoveredNodeIndex,
  selectedNodeIndex,
  graphData,
  authModalOpen,
  onAuthModalOpenChange,
  onSliderChange,
  onSliderChangeComplete,
  onBoldPathsChange,
  onTransparentPathsChange,
  onMinOpacityChange,
  onSliderHover,
  onSliderLeave,
  onResetSliders,
  onLoadAuthorsEstimates,
  onUndo,
  onResetNodePositions,
  onUpdateConnectionLabel,
  onUpdateConnectionTarget,
}: SidebarProps) {
  const { user, loading } = useAuth();

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

      {/* Graph Editing Section */}
      <div className="mb-6 pb-6 border-b border-gray-800">
        <h2 className="text-lg font-bold mb-4">Graph Editing</h2>

        {/* Connection Editor */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Connections</h3>
          <ConnectionEditor
            selectedNode={graphData.nodes.find((_, index) => index === selectedNodeIndex) || null}
            allNodes={graphData.nodes}
            onUpdateConnectionLabel={onUpdateConnectionLabel}
            onUpdateConnectionTarget={onUpdateConnectionTarget}
          />
        </div>
      </div>

      {/* Settings Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">Settings</h2>

        {/* Bold paths toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Make more likely paths bolder?</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={boldPaths}
              onChange={(e) => onBoldPathsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Transparent paths toggle */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">Make less likely paths transparent?</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={transparentPaths}
              onChange={(e) => onTransparentPathsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Min opacity slider - only show when transparency is enabled */}
        {transparentPaths && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm">Minimum opacity?</span>
            <input
              type="range"
              min="0"
              max="100"
              value={minOpacity}
              onChange={(e) => onMinOpacityChange(parseInt(e.target.value))}
              className="w-32 h-2 rounded-full cursor-pointer appearance-none"
              style={{ accentColor: '#1E90FF' }}
            />
          </div>
        )}

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
          <button
            onClick={onUndo}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
          >
            Undo
          </button>
        </div>

        {/* Sliders */}
        <div>
          {questionNodeIndices.map((nodeIndex, sliderIndex) => {
            const node = nodes[nodeIndex];
            const isHighlighted = nodeIndex === hoveredNodeIndex || nodeIndex === selectedNodeIndex;

            return (
              <Slider
                key={nodeIndex}
                node={node}
                value={sliderValues[sliderIndex]}
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
