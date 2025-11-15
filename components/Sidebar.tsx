import { nodes, questionNodeIndices, AUTHORS_ESTIMATES } from '@/lib/graphData';
import { SLIDER_DEFAULT_VALUE } from '@/lib/types';
import { decodeSliderValues } from '@/lib/urlState';
import Slider from './Slider';

interface SidebarProps {
  sliderValues: number[];
  boldPaths: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  hoveredNodeIndex: number;
  selectedNodeIndex: number;
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
}

export default function Sidebar({
  sliderValues,
  boldPaths,
  transparentPaths,
  minOpacity,
  hoveredNodeIndex,
  selectedNodeIndex,
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
}: SidebarProps) {
  return (
    <div className="w-96 h-screen overflow-y-auto bg-background border-r border-gray-800 p-6 flex-shrink-0">
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
