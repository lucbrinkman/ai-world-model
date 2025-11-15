"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Flowchart from '@/components/Flowchart';
import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { readSliderValuesFromUrl, updateUrlWithSliderValues, decodeSliderValues } from '@/lib/urlState';

export default function Home() {
  // Initialize with default values to avoid hydration mismatch
  const [sliderValues, setSliderValues] = useState<number[]>(
    Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE)
  );

  const [selectedNodeIndex, setSelectedNodeIndex] = useState(startNodeIndex);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(-1);
  const [boldPaths, setBoldPaths] = useState(true);
  const [transparentPaths, setTransparentPaths] = useState(false);
  const [minOpacity, setMinOpacity] = useState(20);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Load slider values from URL on mount (after hydration)
  useEffect(() => {
    const urlValues = readSliderValuesFromUrl();
    setSliderValues(urlValues);
  }, []);

  // Update URL whenever slider values change
  useEffect(() => {
    updateUrlWithSliderValues(sliderValues);
  }, [sliderValues]);

  // Calculate probabilities using useMemo (only recalculate when dependencies change)
  const { nodes, edges, maxOutcomeProbability } = useMemo(() => {
    const result = calculateProbabilities(sliderValues, selectedNodeIndex);

    // Find max probability among outcome nodes (good, ambivalent, existential)
    const outcomeNodes = result.nodes.filter(
      n => n.type === 'g' || n.type === 'a' || n.type === 'e'
    );
    const maxOutcomeProbability = Math.max(
      ...outcomeNodes.map(n => n.p),
      0 // Fallback to 0 if no outcome nodes
    );

    return { ...result, maxOutcomeProbability };
  }, [sliderValues, selectedNodeIndex]);

  // Slider change handler
  const handleSliderChange = useCallback((index: number, value: number) => {
    setSliderValues(prev => {
      const newValues = [...prev];
      newValues[index] = value;
      return newValues;
    });
  }, []);

  // Slider change complete handler (for undo)
  const handleSliderChangeComplete = useCallback((index: number) => {
    setSliderValues(current => {
      const currentState = current.join('i');
      setUndoStack(prev => {
        if (prev.length === 0 || prev[prev.length - 1] !== currentState) {
          return [...prev, currentState];
        }
        return prev;
      });
      return current;
    });
  }, []);

  // Node click handler
  const handleNodeClick = useCallback((index: number) => {
    setSelectedNodeIndex(prev => {
      if (index === prev) {
        // Click same node again = reset to start
        return startNodeIndex;
      } else {
        return index;
      }
    });
  }, []);

  // Node hover handler
  const handleNodeHover = useCallback((index: number) => {
    setHoveredNodeIndex(index);
  }, []);

  // Node leave handler
  const handleNodeLeave = useCallback(() => {
    setHoveredNodeIndex(-1);
  }, []);

  // Reset sliders to 50%
  const handleResetSliders = useCallback(() => {
    const newValues = Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE);
    setSliderValues(newValues);
    setUndoStack(prev => [...prev, newValues.join('i')]);
  }, []);

  // Load author's estimates
  const handleLoadAuthorsEstimates = useCallback(() => {
    const authorValues = decodeSliderValues(AUTHORS_ESTIMATES);
    setSliderValues(authorValues);
    setUndoStack(prev => [...prev, authorValues.join('i')]);
  }, []);

  // Undo handler
  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length > 1) {
        const newStack = [...prev];
        newStack.pop();
        const previousState = newStack[newStack.length - 1];
        setSliderValues(decodeSliderValues(previousState));
        return newStack;
      }
      return prev;
    });
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        sliderValues={sliderValues}
        boldPaths={boldPaths}
        transparentPaths={transparentPaths}
        minOpacity={minOpacity}
        hoveredNodeIndex={hoveredNodeIndex}
        selectedNodeIndex={selectedNodeIndex}
        onSliderChange={handleSliderChange}
        onSliderChangeComplete={handleSliderChangeComplete}
        onBoldPathsChange={setBoldPaths}
        onTransparentPathsChange={setTransparentPaths}
        onMinOpacityChange={setMinOpacity}
        onSliderHover={handleNodeHover}
        onSliderLeave={handleNodeLeave}
        onResetSliders={handleResetSliders}
        onLoadAuthorsEstimates={handleLoadAuthorsEstimates}
        onUndo={handleUndo}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              Map of AI Futures
            </h1>
            <Link
              href="/about"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-m text-sm transition-colors"
            >
              About
            </Link>
          </div>
        </header>

        {/* Flowchart */}
        <Flowchart
          nodes={nodes}
          edges={edges}
          sliderValues={sliderValues}
          selectedNodeIndex={selectedNodeIndex}
          hoveredNodeIndex={hoveredNodeIndex}
          boldPaths={boldPaths}
          transparentPaths={transparentPaths}
          minOpacity={minOpacity}
          maxOutcomeProbability={maxOutcomeProbability}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeLeave={handleNodeLeave}
        />
      </div>
    </div>
  );
}
