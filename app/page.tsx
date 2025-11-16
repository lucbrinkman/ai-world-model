"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Flowchart from '@/components/Flowchart';
import ZoomControls from '@/components/ZoomControls';
import DragHint from '@/components/DragHint';
import { WelcomeModal } from '@/components/WelcomeModal';
import { CookieSettings } from '@/components/CookieSettings';
import { useAuth } from '@/hooks/useAuth';
import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, type GraphData } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES, graphData as defaultGraphData } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { decodeSliderValues } from '@/lib/urlState';
import { loadCustomPositions, saveNodePosition, resetAllPositions, hasCustomPositions, type CustomNodePositions } from '@/lib/nodePositionState';
import { getDefaultGraph, saveGraph, updateGraph } from '@/lib/actions/graphs';
import { analytics } from '@/lib/analytics';

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  // Initialize with default values to avoid hydration mismatch
  const [sliderValues, setSliderValues] = useState<number[]>(
    Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE)
  );

  const [selectedNodeIndex, setSelectedNodeIndex] = useState(startNodeIndex);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(-1);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState(-1);
  const [boldPaths, setBoldPaths] = useState(true);
  const [transparentPaths, setTransparentPaths] = useState(false);
  const [minOpacity, setMinOpacity] = useState(20);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);

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
    // Deselect any selected edge when clicking a node
    setSelectedEdgeIndex(-1);
  }, [nodes]);

  // Node hover handler
  const handleNodeHover = useCallback((index: number) => {
    setHoveredNodeIndex(index);
  }, []);

  // Node leave handler
  const handleNodeLeave = useCallback(() => {
    setHoveredNodeIndex(-1);
  }, []);

  // Background click handler - deselect edge
  const handleBackgroundClick = useCallback(() => {
    setSelectedEdgeIndex(-1);
  }, []);

  // Edge click handler
  const handleEdgeClick = useCallback((edgeIndex: number) => {
    setSelectedEdgeIndex(prev => prev === edgeIndex ? -1 : edgeIndex);
    // Deselect node when selecting an edge
    setSelectedNodeIndex(startNodeIndex);
  }, []);

  // Edge reconnect handler
  const handleEdgeReconnect = useCallback((edgeIndex: number, end: 'source' | 'target', newNodeIdOrCoords: string | { x: number; y: number }) => {
    const edge = edges[edgeIndex];
    if (!edge) return;

    // Convert indices to IDs
    const sourceNodeId = nodes[edge.source].id;
    const targetNodeId = edge.target !== undefined ? nodes[edge.target].id : undefined;

    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === sourceNodeId) {
          // This is the source node, update its connection
          const updatedConnections = node.connections.map((conn) => {
            // Find which connection corresponds to this edge (by targetId or by targetX/targetY)
            const isMatchingConnection = targetNodeId ?
              conn.targetId === targetNodeId :
              conn.targetX === edge.targetX && conn.targetY === edge.targetY;

            if (isMatchingConnection && end === 'target') {
              if (typeof newNodeIdOrCoords === 'string') {
                // Reconnecting to a node
                return { ...conn, targetId: newNodeIdOrCoords, targetX: undefined, targetY: undefined };
              } else {
                // Creating floating endpoint
                return { ...conn, targetId: undefined, targetX: newNodeIdOrCoords.x, targetY: newNodeIdOrCoords.y };
              }
            }
            return conn;
          });
          return { ...node, connections: updatedConnections };
        }

        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });

    setHasUnsavedGraphChanges(true);
  }, [edges, nodes]);

  // Edge label update handler
  const handleEdgeLabelUpdate = useCallback((edgeIndex: number, newLabel: string) => {
    const edge = edges[edgeIndex];
    if (!edge) return;

    // Convert indices to IDs
    const sourceNodeId = nodes[edge.source].id;
    const targetNodeId = nodes[edge.target].id;

    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === sourceNodeId) {
          const updatedConnections = node.connections.map((conn) => {
            if (conn.targetId === targetNodeId) {
              return { ...conn, label: newLabel };
            }
            return conn;
          });
          return { ...node, connections: updatedConnections };
        }
        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });

    setHasUnsavedGraphChanges(true);
  }, [edges, nodes]);

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

  const handleAddNode = useCallback((x: number, y: number) => {
    // Generate a unique ID for the new node
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newNodeId = `node_${timestamp}_${randomSuffix}`;

    // Create a new intermediate node at the clicked position
    const newNode = {
      id: newNodeId,
      type: 'i' as const, // Intermediate node type
      title: 'New Node',
      connections: [
        {
          type: '-' as const, // Always connection
          targetId: graphData.nodes[0]?.id || 'start', // Connect to first node or 'start'
          label: 'Always',
        },
      ],
      position: { x, y },
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setHasUnsavedGraphChanges(true);
  }, [graphData]);

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
        graphData={graphData}
        hasUnsavedGraphChanges={hasUnsavedGraphChanges}
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
            <div className="flex items-center gap-3">
              <Link
                href="/about"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
              >
                About
              </Link>
              <button
                onClick={() => setShowCookieSettings(true)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                title="Cookie Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
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
            selectedEdgeIndex={selectedEdgeIndex}
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
            onAddNode={handleAddNode}
            onEdgeClick={handleEdgeClick}
            onEdgeReconnect={handleEdgeReconnect}
            onEdgeLabelUpdate={handleEdgeLabelUpdate}
            onBackgroundClick={handleBackgroundClick}
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

      {/* Cookie Settings Modal */}
      <CookieSettings
        isOpen={showCookieSettings}
        onClose={() => setShowCookieSettings(false)}
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
