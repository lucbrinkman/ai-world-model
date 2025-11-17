"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Flowchart from '@/components/Flowchart';
import ZoomControls from '@/components/ZoomControls';
import DragHint from '@/components/DragHint';
import { WelcomeModal } from '@/components/WelcomeModal';
import { CookieSettings } from '@/components/CookieSettings';
import DeleteNodeDialog from '@/components/DeleteNodeDialog';
import DeleteEdgeDialog from '@/components/DeleteEdgeDialog';
import { useAuth } from '@/hooks/useAuth';
import { SLIDER_COUNT, SLIDER_DEFAULT_VALUE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, type GraphData, type DocumentData } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES, graphData as defaultGraphData } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { decodeSliderValues } from '@/lib/urlState';
import { loadFromLocalStorage, saveToLocalStorage, createDefaultDocumentData, clearLocalStorage } from '@/lib/documentState';
import { getLastOpenedDocument, loadDocument } from '@/lib/actions/documents';
import { useAutoSave } from '@/lib/autoSave';
import AutoSaveIndicator from '@/components/AutoSaveIndicator';
import DocumentPicker from '@/components/DocumentPicker';
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteEdgeDialogOpen, setDeleteEdgeDialogOpen] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<{ index: number; sourceNodeTitle: string } | null>(null);
  const [minOpacity, setMinOpacity] = useState(100);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Zoom state (pan is now handled by native scrolling)
  const [zoom, setZoom] = useState(100);
  const [resetTrigger, setResetTrigger] = useState(1); // Start at 1 to trigger initial positioning

  // Drag hint state
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragShiftHeld, setDragShiftHeld] = useState(false);
  const [dragCursorPos, setDragCursorPos] = useState({ x: 0, y: 0 });

  // Document state (unified storage)
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('Untitled Document');
  const [graphData, setGraphData] = useState<GraphData>(defaultGraphData);

  // Track if we've done the initial document load
  const hasLoadedInitialDocument = useRef(false);

  // Load document on mount (only once)
  useEffect(() => {
    if (authLoading || hasLoadedInitialDocument.current) return;

    hasLoadedInitialDocument.current = true;

    if (user) {
      // Authenticated user: load last opened document from cloud
      getLastOpenedDocument().then(({ data, error }) => {
        if (!error && data) {
          setCurrentDocumentId(data.id);
          setDocumentName(data.name);
          setGraphData({ metadata: data.data.metadata, nodes: data.data.nodes });
          setSliderValues(data.data.sliderValues);
          // Clear localStorage since we're now using cloud storage
          clearLocalStorage();
        }
      });
    } else {
      // Anonymous user: load from localStorage
      const draft = loadFromLocalStorage();
      if (draft) {
        setGraphData({ metadata: draft.metadata, nodes: draft.nodes });
        setSliderValues(draft.sliderValues);
        setDocumentName('My Draft');
      }
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

    // Find max probability among outcome nodes (good, ambivalent, existential)
    const outcomeNodes = result.nodes.filter(
      n => n.type === 'g' || n.type === 'a' || n.type === 'e'
    );
    const maxOutcomeProbability = Math.max(
      ...outcomeNodes.map(n => n.p),
      0 // Fallback to 0 if no outcome nodes
    );

    return { nodes: result.nodes, edges: result.edges, maxOutcomeProbability };
  }, [sliderValues, selectedNodeIndex, graphData]);

  // Create document data for auto-save
  const documentData: DocumentData = useMemo(() => ({
    nodes: graphData.nodes,
    sliderValues,
    metadata: graphData.metadata,
  }), [graphData, sliderValues]);

  // Auto-save hook
  const { saveStatus, error: saveError, lastSavedAt } = useAutoSave({
    documentId: currentDocumentId,
    documentName,
    data: documentData,
    isAuthenticated: !!user,
    authLoading,
  });

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
    setSelectedNodeId(null);
  }, []);

  // Edge click handler
  const handleEdgeClick = useCallback((edgeIndex: number) => {
    setSelectedEdgeIndex(prev => prev === edgeIndex ? -1 : edgeIndex);
    // Deselect node when selecting an edge
    setSelectedNodeIndex(startNodeIndex);
    setSelectedNodeId(null);
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

  }, [edges, nodes]);

  // Edge label update handler
  const handleEdgeLabelUpdate = useCallback((edgeIndex: number, newLabel: string) => {
    const edge = edges[edgeIndex];
    if (!edge || edge.source === undefined || edge.target === undefined) return;

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

  }, [edges, nodes]);

  // Delete edge handler
  const handleDeleteEdge = useCallback((edgeIndex: number) => {
    const edge = edges[edgeIndex];
    if (!edge || edge.source === undefined) return;

    const sourceNode = nodes[edge.source];
    const targetNodeId = edge.target !== undefined ? nodes[edge.target].id : undefined;

    // Find the slider index for this question node before deletion
    const questionNodeIndices = nodes.filter(n => n.type === 'n').map(n => n.index);
    const sliderIndex = questionNodeIndices.indexOf(edge.source);

    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === sourceNode.id) {
          // Remove the connection
          const updatedConnections = node.connections.filter(conn => {
            const isMatchingConnection = targetNodeId ?
              conn.targetId === targetNodeId :
              conn.targetX === edge.targetX && conn.targetY === edge.targetY;
            return !isMatchingConnection;
          });

          // If node now has only 1 connection, convert from QUESTION to INTERMEDIATE
          // Also convert the remaining connection from YES/NO to E100
          let finalConnections = updatedConnections;
          let updatedType = node.type;

          if (updatedConnections.length === 1) {
            updatedType = 'i';
            finalConnections = updatedConnections.map(conn => ({
              ...conn,
              type: '-' as const,
              label: '',
            }));
          }

          return { ...node, connections: finalConnections, type: updatedType };
        }
        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });

    // Remove the slider value for the deleted question
    if (sliderIndex !== -1) {
      setSliderValues(prev => {
        const newValues = [...prev];
        newValues.splice(sliderIndex, 1);
        return newValues;
      });
    }

    setSelectedEdgeIndex(-1);
  }, [edges, nodes]);

  // Add arrow handler
  const handleAddArrow = useCallback((nodeId: string, direction: 'top' | 'bottom' | 'left' | 'right') => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          // Calculate floating endpoint position based on direction
          const offset = 150; // Distance from node center
          let targetX = node.position.x;
          let targetY = node.position.y;

          switch (direction) {
            case 'top':
              targetY -= offset;
              break;
            case 'bottom':
              targetY += offset;
              break;
            case 'left':
              targetX -= offset;
              break;
            case 'right':
              targetX += offset;
              break;
          }

          // Convert existing connection from E100 to YES
          const updatedExistingConnections = node.connections.map(conn => {
            if (conn.type === '-') {
              return { ...conn, type: 'y' as const, label: 'Yes' };
            }
            return conn;
          });

          // Add new connection with NO type
          const newConnection = {
            type: 'n' as const,
            targetX,
            targetY,
            label: 'No',
          };

          const updatedConnections = [...updatedExistingConnections, newConnection];

          // Convert node from INTERMEDIATE to QUESTION
          return { ...node, connections: updatedConnections, type: 'n' as const };
        }
        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });

    // Add a slider value for the newly created question node
    // Find the index this question will have among all questions
    setSliderValues(prev => {
      // After the graph update, recalculate which nodes are questions
      const updatedGraphNodes = graphData.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, type: 'n' as const };
        }
        return node;
      });

      const questionNodes = updatedGraphNodes.filter(n => n.type === 'n');
      const newQuestionIndex = questionNodes.findIndex(n => n.id === nodeId);

      // Insert default value at the appropriate index
      const newValues = [...prev];
      newValues.splice(newQuestionIndex, 0, SLIDER_DEFAULT_VALUE);
      return newValues;
    });
  }, [graphData.nodes]);

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
    // Update graph data with new position (auto-save will handle persistence)
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

      // Push away any floating arrow endpoints that are underneath this node
      const nodeWidth = 145;
      const nodeHeight = 55;
      const padding = 10; // Small padding around the node

      const nodeBounds = {
        left: newX - nodeWidth / 2 - padding,
        right: newX + nodeWidth / 2 + padding,
        top: newY - nodeHeight / 2 - padding,
        bottom: newY + nodeHeight / 2 + padding,
      };

      const updatedNodesWithPushedEndpoints = updatedNodes.map(node => {
        const updatedConnections = node.connections.map(connection => {
          // Check if this is a floating endpoint
          if (connection.targetX !== undefined && connection.targetY !== undefined) {
            // Check if the endpoint is within the moved node's bounds
            if (
              connection.targetX >= nodeBounds.left &&
              connection.targetX <= nodeBounds.right &&
              connection.targetY >= nodeBounds.top &&
              connection.targetY <= nodeBounds.bottom
            ) {
              // Calculate direction from node center to endpoint
              const dx = connection.targetX - newX;
              const dy = connection.targetY - newY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // If endpoint is at the exact center, push it to the right
              if (distance === 0) {
                return {
                  ...connection,
                  targetX: nodeBounds.right + 5,
                  targetY: newY,
                };
              }

              // Normalize direction
              const normalizedDx = dx / distance;
              const normalizedDy = dy / distance;

              // Calculate which edge of the rectangle we'll exit from
              // and the distance to that edge plus padding
              const halfWidth = nodeWidth / 2;
              const halfHeight = nodeHeight / 2;

              // Find which edge we hit first by comparing ratios
              const tX = normalizedDx !== 0 ? halfWidth / Math.abs(normalizedDx) : Infinity;
              const tY = normalizedDy !== 0 ? halfHeight / Math.abs(normalizedDy) : Infinity;
              const t = Math.min(tX, tY);

              // Push distance is to the edge plus padding plus extra space (doubled)
              const pushDistance = t + (padding + 5) * 2;

              return {
                ...connection,
                targetX: newX + normalizedDx * pushDistance,
                targetY: newY + normalizedDy * pushDistance,
              };
            }
          }
          return connection;
        });

        return {
          ...node,
          connections: updatedConnections,
        };
      });

      return {
        ...prev,
        nodes: updatedNodesWithPushedEndpoints,
      };
    });

  }, []);

  // Reset node positions handler
  const handleResetNodePositions = useCallback(() => {
    // Reset positions to defaults from defaultGraphData
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        const defaultNode = defaultGraphData.nodes.find(n => n.id === node.id);
        if (defaultNode) {
          return { ...node, position: defaultNode.position };
        }
        return node;
      }),
    }));
  }, []);

  // Node drag state handler
  const handleNodeDragStateChange = useCallback((isDragging: boolean, shiftHeld: boolean, cursorX?: number, cursorY?: number) => {
    setIsDraggingNode(isDragging);
    setDragShiftHeld(shiftHeld);
    if (cursorX !== undefined && cursorY !== undefined) {
      setDragCursorPos({ x: cursorX, y: cursorY });
    }
  }, []);

  // Document picker handlers
  const handleDocumentSelect = useCallback(async (documentId: string) => {
    const { data, error } = await loadDocument(documentId);
    if (!error && data) {
      setCurrentDocumentId(data.id);
      setDocumentName(data.name);
      setGraphData({ metadata: data.data.metadata, nodes: data.data.nodes });
      setSliderValues(data.data.sliderValues);
      setSelectedNodeIndex(startNodeIndex); // Reset to start
    }
  }, []);

  const handleCreateNewDocument = useCallback(() => {
    setCurrentDocumentId(null);
    setDocumentName('Untitled Document');
    setGraphData(defaultGraphData);
    setSliderValues(Array(SLIDER_COUNT).fill(SLIDER_DEFAULT_VALUE));
    setSelectedNodeIndex(startNodeIndex);
  }, []);

  const handleRenameDocument = useCallback((newName: string) => {
    setDocumentName(newName);
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
  }, []);


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
          targetX: x + 150, // Free-floating edge pointing to the right
          targetY: y,
          label: 'Always',
        },
      ],
      position: { x, y },
      sliderIndex: null, // Intermediate nodes don't have sliders
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

  }, [graphData]);

  const handleInitiateDelete = useCallback((nodeId: string) => {
    // Find the node to delete
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Prevent deleting the start node
    if (node.type === 's') {
      alert('Cannot delete the start node');
      return;
    }

    // Open confirmation dialog
    setNodeToDelete({ id: nodeId, title: node.title });
    setDeleteDialogOpen(true);
  }, [graphData]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    // Find the node to delete
    const nodeToDelete = graphData.nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    // Get the node's position for converting incoming edges to free-floating
    const nodePosition = nodeToDelete.position;

    // Check if we need to reset selectedNodeIndex
    const deletedNodeIndex = nodes.findIndex(n => n.id === nodeId);
    const shouldResetSelection = deletedNodeIndex === selectedNodeIndex;

    // Use flushSync to ensure all state updates happen synchronously
    // This prevents intermediate renders with mismatched indices
    flushSync(() => {
      // Clear UI state
      setSelectedNodeId(null);
      setDeleteDialogOpen(false);
      setNodeToDelete(null);

      // Reset selection if needed
      if (shouldResetSelection) {
        setSelectedNodeIndex(startNodeIndex);
        setSelectedNodeId(null);
      }

      // Update graph data
      setGraphData(prev => {
        // Remove the node from the array
        const updatedNodes = prev.nodes.filter(n => n.id !== nodeId);

        // Convert incoming edges to free-floating endpoints
        const nodesWithUpdatedConnections = updatedNodes.map(node => {
          const updatedConnections = node.connections.map(conn => {
            if (conn.targetId === nodeId) {
              // Convert to free-floating endpoint
              return {
                ...conn,
                targetId: undefined,
                targetX: nodePosition.x,
                targetY: nodePosition.y,
              };
            }
            return conn;
          });

          return {
            ...node,
            connections: updatedConnections,
          };
        });

        // Re-index slider indices if deleting a question node
        const deletedSliderIndex = nodeToDelete.sliderIndex;
        const finalNodes = deletedSliderIndex !== null && deletedSliderIndex !== undefined
          ? nodesWithUpdatedConnections.map(node => {
              if (node.sliderIndex !== null && node.sliderIndex !== undefined && node.sliderIndex > deletedSliderIndex) {
                return {
                  ...node,
                  sliderIndex: node.sliderIndex - 1,
                };
              }
              return node;
            })
          : nodesWithUpdatedConnections;

        return {
          ...prev,
          nodes: finalNodes,
        };
      });

      });
  }, [graphData, nodes, selectedNodeIndex]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setNodeToDelete(null);
  }, []);

  const handleInitiateDeleteEdge = useCallback((edgeIndex: number) => {
    const edge = edges[edgeIndex];
    if (!edge) return;

    const sourceNode = graphData.nodes[edge.source];
    setEdgeToDelete({ index: edgeIndex, sourceNodeTitle: sourceNode.title });
    setDeleteEdgeDialogOpen(true);
  }, [edges, graphData.nodes]);

  const handleCancelDeleteEdge = useCallback(() => {
    setDeleteEdgeDialogOpen(false);
    setEdgeToDelete(null);
  }, []);

  // Change node type handler
  const handleChangeNodeType = useCallback((nodeId: string, newType: 'n' | 'i' | 'g' | 'a' | 'e') => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Don't allow changing start node type
    if (node.type === 's') {
      alert('Cannot change the type of the start node');
      return;
    }

    const oldType = node.type;
    if (oldType === newType) return; // No change

    flushSync(() => {
      setGraphData(prev => {
        const updatedNodes = prev.nodes.map(n => {
          if (n.id !== nodeId) return n;

          // Changing TO question node
          if (newType === 'n') {
            // Find the highest sliderIndex among existing questions
            const questionNodes = prev.nodes.filter(node => node.type === 'n');
            const maxSliderIndex = questionNodes.reduce((max, node) =>
              node.sliderIndex !== null && node.sliderIndex > max ? node.sliderIndex : max, -1);
            const newSliderIndex = maxSliderIndex + 1;

            // Ensure node has exactly 2 connections (YES and NO)
            let connections = [...n.connections];
            if (connections.length === 0) {
              // Create 2 new free-floating connections
              connections = [
                { type: 'y' as const, targetX: n.position.x + 150, targetY: n.position.y - 50, label: 'Yes' },
                { type: 'n' as const, targetX: n.position.x + 150, targetY: n.position.y + 50, label: 'No' },
              ];
            } else if (connections.length === 1) {
              // Keep existing as YES, add NO
              connections[0] = { ...connections[0], type: 'y' as const };
              connections.push({ type: 'n' as const, targetX: n.position.x + 150, targetY: n.position.y + 50, label: 'No' });
            } else {
              // Has 2+ connections: convert first to YES, second to NO, keep rest as-is
              connections[0] = { ...connections[0], type: 'y' as const };
              connections[1] = { ...connections[1], type: 'n' as const };
            }

            return {
              ...n,
              type: newType,
              sliderIndex: newSliderIndex,
              connections,
            };
          }

          // Changing FROM question node to something else
          if (oldType === 'n') {
            // Convert YES/NO connections to ALWAYS
            const connections = n.connections.map(conn => ({
              ...conn,
              type: '-' as const,
            }));

            return {
              ...n,
              type: newType,
              sliderIndex: null,
              connections,
            };
          }

          // Other type changes (just change the type)
          return {
            ...n,
            type: newType,
          };
        });

        // If changing FROM question, need to re-index remaining questions and update sliderValues
        if (oldType === 'n') {
          const oldSliderIndex = node.sliderIndex;
          if (oldSliderIndex !== null) {
            // Re-index all questions that had higher indices
            const finalNodes = updatedNodes.map(n => {
              if (n.type === 'n' && n.sliderIndex !== null && n.sliderIndex > oldSliderIndex) {
                return { ...n, sliderIndex: n.sliderIndex - 1 };
              }
              return n;
            });

            // Update sliderValues array (remove the slider at oldSliderIndex)
            setSliderValues(prev => {
              const newValues = [...prev];
              newValues.splice(oldSliderIndex, 1);
              return newValues;
            });

            return { ...prev, nodes: finalNodes };
          }
        }

        // If changing TO question, add a new slider value (default 50)
        if (newType === 'n') {
          setSliderValues(prev => [...prev, 50]);
        }

        return { ...prev, nodes: updatedNodes };
      });

      });
  }, [graphData]);

  // Keyboard handler for Delete/Backspace keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if a node is selected and we're not editing text
      if (!selectedNodeId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.target as HTMLElement).contentEditable === 'true') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleInitiateDelete(selectedNodeId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, handleInitiateDelete]);

  // Settings change handlers with analytics
  const handleMinOpacityChange = useCallback((value: number) => {
    setMinOpacity(value);
    analytics.trackSettingChange('min_opacity', value);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        sliderValues={sliderValues}
        minOpacity={minOpacity}
        hoveredNodeIndex={hoveredNodeIndex}
        selectedNodeIndex={selectedNodeIndex}
        graphData={graphData}
        authModalOpen={authModalOpen}
        onAuthModalOpenChange={setAuthModalOpen}
        onSliderChange={handleSliderChange}
        onSliderChangeComplete={handleSliderChangeComplete}
        onMinOpacityChange={handleMinOpacityChange}
        onSliderHover={handleNodeHover}
        onSliderLeave={handleNodeLeave}
        onResetSliders={handleResetSliders}
        onLoadAuthorsEstimates={handleLoadAuthorsEstimates}
        onResetNodePositions={handleResetNodePositions}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="border-b border-gray-800 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">
                Map of AI Futures
              </h1>
              <DocumentPicker
                currentDocumentId={currentDocumentId}
                currentDocumentName={documentName}
                isAuthenticated={!!user}
                onDocumentSelect={handleDocumentSelect}
                onCreateNew={handleCreateNewDocument}
                onRename={handleRenameDocument}
              />
              <AutoSaveIndicator
                saveStatus={saveStatus}
                isAuthenticated={!!user}
                error={saveError}
                lastSavedAt={lastSavedAt}
                onSignInClick={() => setAuthModalOpen(true)}
              />
            </div>
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
            selectedNodeId={selectedNodeId}
            boldPaths={true}
            transparentPaths={minOpacity < 100}
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
            onNodeSelect={setSelectedNodeId}
            onDeleteNode={handleInitiateDelete}
            onChangeNodeType={handleChangeNodeType}
            onEdgeClick={handleEdgeClick}
            onEdgeReconnect={handleEdgeReconnect}
            onEdgeLabelUpdate={handleEdgeLabelUpdate}
            onDeleteEdge={handleInitiateDeleteEdge}
            onAddArrow={handleAddArrow}
            onBackgroundClick={handleBackgroundClick}
            onSliderChange={handleSliderChange}
            onSliderChangeComplete={handleSliderChangeComplete}
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

      {/* Delete Node Dialog */}
      <DeleteNodeDialog
        isOpen={deleteDialogOpen}
        nodeTitle={nodeToDelete?.title || ''}
        onConfirm={() => nodeToDelete && handleDeleteNode(nodeToDelete.id)}
        onCancel={handleCancelDelete}
      />

      {/* Delete Edge Dialog */}
      <DeleteEdgeDialog
        isOpen={deleteEdgeDialogOpen}
        sourceNodeTitle={edgeToDelete?.sourceNodeTitle || ''}
        onConfirm={() => {
          if (edgeToDelete) {
            handleDeleteEdge(edgeToDelete.index);
            setDeleteEdgeDialogOpen(false);
            setEdgeToDelete(null);
          }
        }}
        onCancel={handleCancelDeleteEdge}
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
