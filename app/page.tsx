"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Flowchart from '@/components/Flowchart';
import ZoomControls from '@/components/ZoomControls';
import DragHint from '@/components/DragHint';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useAuth } from '@/hooks/useAuth';
import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { decodeSliderValues } from '@/lib/urlState';
import { loadCustomPositions, saveNodePosition, resetAllPositions, hasCustomPositions, type CustomNodePositions } from '@/lib/nodePositionState';
import { analytics } from '@/lib/analytics';

export default function Home() {
  const { user, loading: authLoading } = useAuth();

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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Zoom state (pan is now handled by native scrolling)
  const [zoom, setZoom] = useState(100);
  const [resetTrigger, setResetTrigger] = useState(1); // Start at 1 to trigger initial positioning

  // Custom node positions (stored in localStorage)
  const [customNodePositions, setCustomNodePositions] = useState<CustomNodePositions>({});

  // Drag hint state
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragShiftHeld, setDragShiftHeld] = useState(false);
  const [dragCursorPos, setDragCursorPos] = useState({ x: 0, y: 0 });

  // Load custom node positions from localStorage on mount
  useEffect(() => {
    const positions = loadCustomPositions();
    setCustomNodePositions(positions);
  }, []);

  // Check if user is new and show welcome modal
  useEffect(() => {
    if (!authLoading && user) {
      // Check if we've already shown the welcome modal for this user
      const welcomeShownKey = `welcome_shown_${user.id}`;
      const hasShownWelcome = localStorage.getItem(welcomeShownKey);

      if (!hasShownWelcome) {
        // Check if user was created recently (within last 30 minutes for testing)
        const userCreatedAt = new Date(user.created_at);
        const now = new Date();
        const minutesSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000 / 60;

        console.log('User created:', userCreatedAt, 'Minutes ago:', minutesSinceCreation);

        if (minutesSinceCreation < 30) {
          // New user! Show welcome modal
          console.log('Showing welcome modal');
          setShowWelcomeModal(true);
          localStorage.setItem(welcomeShownKey, 'true');
        }
      } else {
        console.log('Welcome modal already shown for this user');
      }
    }
  }, [user, authLoading]);

  // Calculate probabilities using useMemo (only recalculate when dependencies change)
  const { nodes, edges, maxOutcomeProbability } = useMemo(() => {
    const result = calculateProbabilities(sliderValues, selectedNodeIndex);

    // Apply custom node positions (overlay on top of calculated positions)
    const nodesWithCustomPositions = result.nodes.map(node => {
      if (customNodePositions[node.id]) {
        return {
          ...node,
          x: customNodePositions[node.id].x,
          y: customNodePositions[node.id].y,
        };
      }
      return node;
    });

    // Find max probability among outcome nodes (good, ambivalent, existential)
    const outcomeNodes = nodesWithCustomPositions.filter(
      n => n.type === 'g' || n.type === 'a' || n.type === 'e'
    );
    const maxOutcomeProbability = Math.max(
      ...outcomeNodes.map(n => n.p),
      0 // Fallback to 0 if no outcome nodes
    );

    return { nodes: nodesWithCustomPositions, edges: result.edges, maxOutcomeProbability };
  }, [sliderValues, selectedNodeIndex, customNodePositions]);

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
      // Track analytics
      analytics.trackSliderChange(index, current[index]);

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
      const newIndex = index === prev ? startNodeIndex : index;

      // Track analytics (after calculating new index)
      const nodeId = nodes[index]?.id || `node-${index}`;
      const nodeType = nodes[index]?.type || 'unknown';
      analytics.trackNodeClick(nodeId, nodeType);

      // Track probability root change
      const newNodeId = newIndex === startNodeIndex ? null : (nodes[newIndex]?.id || `node-${newIndex}`);
      analytics.trackProbabilityRootChange(newNodeId);

      if (index === prev) {
        // Click same node again = reset to start
        return startNodeIndex;
      } else {
        return index;
      }
    });
  }, [nodes]);

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

    // Track analytics
    analytics.trackAction('reset');
  }, []);

  // Load author's estimates
  const handleLoadAuthorsEstimates = useCallback(() => {
    const authorValues = decodeSliderValues(AUTHORS_ESTIMATES);
    setSliderValues(authorValues);
    setUndoStack(prev => [...prev, authorValues.join('i')]);

    // Track analytics
    analytics.trackAction('load_authors_estimates');
  }, []);

  // Undo handler
  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length > 1) {
        const newStack = [...prev];
        newStack.pop();
        const previousState = newStack[newStack.length - 1];
        const previousValues = decodeSliderValues(previousState);
        setSliderValues(previousValues);

        // Track analytics
        analytics.trackAction('undo');

        return newStack;
      }
      return prev;
    });
  }, []);

  // Node drag end handler
  const handleNodeDragEnd = useCallback((nodeId: string, newX: number, newY: number) => {
    // Save to localStorage
    saveNodePosition(nodeId, newX, newY);

    // Update state
    setCustomNodePositions(prev => ({
      ...prev,
      [nodeId]: { x: newX, y: newY },
    }));
  }, []);

  // Reset node positions handler
  const handleResetNodePositions = useCallback(() => {
    resetAllPositions();
    setCustomNodePositions({});
  }, []);

  // Node drag state handler
  const handleNodeDragStateChange = useCallback((isDragging: boolean, shiftHeld: boolean, cursorX?: number, cursorY?: number) => {
    setIsDraggingNode(isDragging);
    setDragShiftHeld(shiftHeld);
    if (cursorX !== undefined && cursorY !== undefined) {
      setDragCursorPos({ x: cursorX, y: cursorY });
    }
  }, []);

  // Load scenario handler
  const handleLoadScenario = useCallback((loadedValues: number[]) => {
    setSliderValues(loadedValues);
    setUndoStack(prev => [...prev, loadedValues.join('i')]);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      // Buttons don't zoom to cursor, they zoom to center
      // No pan adjustment needed, clamping will happen in Flowchart
      return newZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      // Buttons don't zoom to cursor, they zoom to center
      // No pan adjustment needed, clamping will happen in Flowchart
      return newZoom;
    });
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    // Increment reset trigger to force scroll reset even if zoom is already 100%
    setResetTrigger(prev => prev + 1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  // Settings change handlers with analytics
  const handleBoldPathsChange = useCallback((value: boolean) => {
    setBoldPaths(value);
    analytics.trackSettingChange('bold_paths', value);
  }, []);

  const handleTransparentPathsChange = useCallback((value: boolean) => {
    setTransparentPaths(value);
    analytics.trackSettingChange('transparent_paths', value);
  }, []);

  const handleMinOpacityChange = useCallback((value: number) => {
    setMinOpacity(value);
    analytics.trackSettingChange('min_opacity', value);
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
        onBoldPathsChange={handleBoldPathsChange}
        onTransparentPathsChange={handleTransparentPathsChange}
        onMinOpacityChange={handleMinOpacityChange}
        onSliderHover={handleNodeHover}
        onSliderLeave={handleNodeLeave}
        onResetSliders={handleResetSliders}
        onLoadAuthorsEstimates={handleLoadAuthorsEstimates}
        onUndo={handleUndo}
        onResetNodePositions={handleResetNodePositions}
        onLoadScenario={handleLoadScenario}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="border-b border-gray-800 p-4 flex-shrink-0">
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
        <div className="flex-1 min-h-0">
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
            zoom={zoom}
            resetTrigger={resetTrigger}
            onZoomChange={handleZoomChange}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onNodeLeave={handleNodeLeave}
            onNodeDragEnd={handleNodeDragEnd}
            onNodeDragStateChange={handleNodeDragStateChange}
          />
          <DragHint isVisible={isDraggingNode} shiftHeld={dragShiftHeld} cursorX={dragCursorPos.x} cursorY={dragCursorPos.y} />
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleResetView}
          />
        </div>
      </div>

      {/* Welcome Modal for new users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userEmail={user?.email || ''}
      />

      {/* Dev-only buttons */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-50">
          {/* Clear Site Data button */}
          <button
            onClick={async () => {
              // Sign out from Supabase (clears auth cookies)
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();

              // Clear localStorage
              localStorage.clear();
              // Clear sessionStorage
              sessionStorage.clear();
              // Clear IndexedDB (where PostHog stores data)
              if (window.indexedDB) {
                window.indexedDB.databases().then(databases => {
                  databases.forEach(db => {
                    if (db.name) {
                      window.indexedDB.deleteDatabase(db.name);
                    }
                  });
                });
              }
              // Reload page to reset everything
              window.location.reload();
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-red-600 text-sm"
            title="Dev only: Clear all site data and reload"
          >
            Clear Site Data
          </button>

          {/* Test Welcome Modal button */}
          {user && (
            <button
              onClick={() => setShowWelcomeModal(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-orange-600 text-sm"
              title="Dev only: Test welcome modal"
            >
              Test Welcome
            </button>
          )}
        </div>
      )}
    </div>
  );
}
