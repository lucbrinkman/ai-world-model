"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Flowchart from '@/components/Flowchart';
import ZoomControls from '@/components/ZoomControls';
import DragHint from '@/components/DragHint';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useAuth } from '@/hooks/useAuth';
import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, type GraphData } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES, graphData as defaultGraphData } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { readSliderValuesFromUrl, updateUrlWithSliderValues, decodeSliderValues } from '@/lib/urlState';
import { loadCustomPositions, saveNodePosition, resetAllPositions, hasCustomPositions, type CustomNodePositions } from '@/lib/nodePositionState';
import { getDefaultGraph, saveGraph, updateGraph } from '@/lib/actions/graphs';

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

  // Editable graph data state
  const [graphData, setGraphData] = useState<GraphData>(defaultGraphData);
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null);
  const [hasUnsavedGraphChanges, setHasUnsavedGraphChanges] = useState(false);

  // Load slider values from URL on mount (after hydration)
  useEffect(() => {
    const urlValues = readSliderValuesFromUrl();
    setSliderValues(urlValues);
  }, []);

  // Load custom node positions from localStorage on mount
  useEffect(() => {
    const positions = loadCustomPositions();
    setCustomNodePositions(positions);
  }, []);

  // Load user's default graph from database on mount (if authenticated)
  useEffect(() => {
    if (!authLoading && user) {
      getDefaultGraph().then(({ data, error }) => {
        if (!error && data) {
          setGraphData(data.graph_data);
          setCurrentGraphId(data.id);
          setHasUnsavedGraphChanges(false);
        }
      });
    }
  }, [user, authLoading]);

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

  // Update URL whenever slider values change
  useEffect(() => {
    updateUrlWithSliderValues(sliderValues);
  }, [sliderValues]);

  // Calculate probabilities using useMemo (only recalculate when dependencies change)
  const { nodes, edges, maxOutcomeProbability } = useMemo(() => {
    const result = calculateProbabilities(sliderValues, selectedNodeIndex, graphData);

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
  }, [sliderValues, selectedNodeIndex, customNodePositions, graphData]);

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

  // Node drag end handler
  const handleNodeDragEnd = useCallback((nodeId: string, newX: number, newY: number) => {
    // Save to localStorage
    saveNodePosition(nodeId, newX, newY);

    // Update state
    setCustomNodePositions(prev => ({
      ...prev,
      [nodeId]: { x: newX, y: newY },
    }));

    // Update graph data with new position
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            position: { x: newX, y: newY },
          };
        }
        return node;
      });
      return {
        ...prev,
        nodes: updatedNodes,
      };
    });

    setHasUnsavedGraphChanges(true);
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

  // Graph editing handlers
  const handleUpdateNodeText = useCallback((nodeId: string, newText: string) => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            title: newText,
          };
        }
        return node;
      });
      return {
        ...prev,
        nodes: updatedNodes,
      };
    });
    setHasUnsavedGraphChanges(true);
  }, []);

  const handleUpdateConnectionLabel = useCallback((nodeId: string, connectionIndex: number, newLabel: string) => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          const updatedConnections = [...node.connections];
          updatedConnections[connectionIndex] = {
            ...updatedConnections[connectionIndex],
            label: newLabel,
          };
          return {
            ...node,
            connections: updatedConnections,
          };
        }
        return node;
      });
      return {
        ...prev,
        nodes: updatedNodes,
      };
    });
    setHasUnsavedGraphChanges(true);
  }, []);

  const handleUpdateConnectionTarget = useCallback((nodeId: string, connectionIndex: number, newTargetId: string) => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          const updatedConnections = [...node.connections];
          updatedConnections[connectionIndex] = {
            ...updatedConnections[connectionIndex],
            targetId: newTargetId,
          };
          return {
            ...node,
            connections: updatedConnections,
          };
        }
        return node;
      });
      return {
        ...prev,
        nodes: updatedNodes,
      };
    });
    setHasUnsavedGraphChanges(true);
  }, []);

  const handleLoadGraph = useCallback((loadedGraphData: GraphData, graphId: string | null = null) => {
    setGraphData(loadedGraphData);
    setCurrentGraphId(graphId);
    setHasUnsavedGraphChanges(false);
    // Clear custom positions when loading a new graph
    resetAllPositions();
    setCustomNodePositions({});
  }, []);

  const handleResetToDefaultGraph = useCallback(() => {
    setGraphData(defaultGraphData);
    setCurrentGraphId(null);
    setHasUnsavedGraphChanges(false);
    resetAllPositions();
    setCustomNodePositions({});
  }, []);

  const handleSaveGraph = useCallback(async () => {
    if (!user) {
      alert('Please sign in to save graphs');
      return;
    }

    const graphName = prompt('Enter a name for this graph:');
    if (!graphName) return;

    if (currentGraphId) {
      // Update existing graph
      const { error } = await updateGraph(currentGraphId, graphName, graphData, true);
      if (error) {
        alert(`Error updating graph: ${error}`);
      } else {
        alert('Graph updated successfully!');
        setHasUnsavedGraphChanges(false);
      }
    } else {
      // Save new graph
      const { error } = await saveGraph(graphName, graphData, true);
      if (error) {
        alert(`Error saving graph: ${error}`);
      } else {
        alert('Graph saved successfully!');
        setHasUnsavedGraphChanges(false);
      }
    }
  }, [user, graphData, currentGraphId]);

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
        graphData={graphData}
        hasUnsavedGraphChanges={hasUnsavedGraphChanges}
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
        onResetNodePositions={handleResetNodePositions}
        onLoadScenario={handleLoadScenario}
        onUpdateConnectionLabel={handleUpdateConnectionLabel}
        onUpdateConnectionTarget={handleUpdateConnectionTarget}
        onSaveGraph={handleSaveGraph}
        onLoadGraph={handleLoadGraph}
        onResetGraph={handleResetToDefaultGraph}
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
            onUpdateNodeText={handleUpdateNodeText}
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

      {/* Dev-only: Test Welcome Modal button */}
      {process.env.NODE_ENV === 'development' && user && (
        <button
          onClick={() => setShowWelcomeModal(true)}
          className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-orange-600 text-sm z-50"
          title="Dev only: Test welcome modal"
        >
          Test Welcome
        </button>
      )}
    </div>
  );
}
