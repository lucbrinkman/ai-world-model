"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import SettingsMenu from '@/components/SettingsMenu';
import Flowchart from '@/components/Flowchart';
import ZoomControls from '@/components/ZoomControls';
import DragHint from '@/components/DragHint';
import { WelcomeModal } from '@/components/WelcomeModal';
import { AuthModal } from '@/components/auth/AuthModal';
import DeleteNodeDialog from '@/components/DeleteNodeDialog';
import DeleteEdgeDialog from '@/components/DeleteEdgeDialog';
import MobileWarning from '@/components/MobileWarning';
import { useAuth } from '@/hooks/useAuth';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, type GraphData, type DocumentData, type GraphNode } from '@/lib/types';
import { startNodeIndex, AUTHORS_ESTIMATES, graphData as defaultGraphData } from '@/lib/graphData';
import { calculateProbabilities } from '@/lib/probability';
import { loadFromLocalStorage, saveToLocalStorage, createDefaultDocumentData, clearLocalStorage, createEmptyDocumentData } from '@/lib/documentState';
import { getLastOpenedDocument, loadDocument } from '@/lib/actions/documents';
import { useAutoSave } from '@/lib/autoSave';
import AutoSaveIndicator from '@/components/AutoSaveIndicator';
import DocumentPicker from '@/components/DocumentPicker';
import { ShareModal } from '@/components/ShareModal';
import { analytics } from '@/lib/analytics';

function HomeContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [probabilityRootIndex, setProbabilityRootIndex] = useState(startNodeIndex);
  const [previewProbabilityRootIndex, setPreviewProbabilityRootIndex] = useState<number | null>(null);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(-1);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState(-1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredDestinationDotIndex, setHoveredDestinationDotIndex] = useState(-1);
  const [draggingEdgeIndex, setDraggingEdgeIndex] = useState(-1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteEdgeDialogOpen, setDeleteEdgeDialogOpen] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<{ index: number; sourceNodeTitle: string } | null>(null);
  const [minOpacity, setMinOpacity] = useState(100);
  const [undoStack, setUndoStack] = useState<GraphNode[][]>([]);
  const [showMobileWarning, setShowMobileWarning] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

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

  // Track editor close events to prevent context menu from opening
  const editorCloseTimestampRef = useRef(0);

  // Share button tooltip timeout
  const shareTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorClose = useCallback(() => {
    editorCloseTimestampRef.current = Date.now();
  }, []);

  // Share button tooltip handlers
  const handleShareMouseEnter = useCallback(() => {
    shareTooltipTimeoutRef.current = setTimeout(() => {
      setShowShareTooltip(true);
    }, 350); // Show tooltip after 0.35 seconds
  }, []);

  const handleShareMouseLeave = useCallback(() => {
    setShowShareTooltip(false);
    if (shareTooltipTimeoutRef.current) {
      clearTimeout(shareTooltipTimeoutRef.current);
      shareTooltipTimeoutRef.current = null;
    }
  }, []);

  // Cleanup share tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (shareTooltipTimeoutRef.current) {
        clearTimeout(shareTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Load sidebar collapse state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Save sidebar collapse state to localStorage when it changes
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  // Load specific document from URL parameter (e.g., from shared links)
  useEffect(() => {
    console.log('[Page] URL param effect - authLoading:', authLoading, 'user:', !!user)
    if (authLoading) return; // Only wait for auth loading, not user

    const docId = searchParams.get('doc');
    console.log('[Page] URL param docId:', docId, 'currentDocumentId:', currentDocumentId)
    if (!docId) return;

    // Don't reload if we're already viewing this document
    if (currentDocumentId === docId) {
      console.log('[Page] Already viewing this document, skipping load')
      return;
    }

    // Only authenticated users can load documents from URL
    if (!user) {
      console.log('[Page] No user, cannot load document from URL')
      return;
    }

    console.log('[Page] Loading document from URL:', docId)
    loadDocument(docId).then(({ data, error }) => {
      console.log('[Page] Load result - error:', error, 'data:', !!data)
      if (!error && data) {
        // Migrate old data: ensure all nodes have probability field
        const migratedNodes = data.data.nodes.map(node => {
          if (node.probability === undefined) {
            return {
              ...node,
              probability: node.type === 'n' ? 50 : null
            };
          }
          return node;
        });

        console.log('[Page] Setting document state:', data.id, data.name, migratedNodes.length, 'nodes')
        setCurrentDocumentId(data.id);
        setDocumentName(data.name);
        setGraphData({ metadata: data.data.metadata, nodes: migratedNodes });
        clearLocalStorage();
        hasLoadedInitialDocument.current = true;
      }
    });
  }, [user, authLoading, searchParams, currentDocumentId]);

  // Load document on mount (only once, when no specific doc requested)
  useEffect(() => {
    if (authLoading || hasLoadedInitialDocument.current) return;

    const docId = searchParams.get('doc');
    if (docId) return; // Will be handled by the effect above

    hasLoadedInitialDocument.current = true;

    if (user) {
      // Load last opened document from cloud
      getLastOpenedDocument().then(({ data, error }) => {
        if (!error && data) {
          // Migrate old data: ensure all nodes have probability field
          const migratedNodes = data.data.nodes.map(node => {
            if (node.probability === undefined) {
              return {
                ...node,
                probability: node.type === 'n' ? 50 : null
              };
            }
            return node;
          });

          setCurrentDocumentId(data.id);
          setDocumentName(data.name);
          setGraphData({ metadata: data.data.metadata, nodes: migratedNodes });
          // Clear localStorage since we're now using cloud storage
          clearLocalStorage();
        }
      });
    } else {
      // Anonymous user: load from localStorage
      const result = loadFromLocalStorage();
      if (result) {
        // Migration is already done in loadFromLocalStorage()
        setGraphData({ metadata: result.data.metadata, nodes: result.data.nodes });
        setDocumentName(result.name || 'My Draft');
      }
    }
  }, [user, authLoading, searchParams]);

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
    // Use preview index if hovering, otherwise use actual root index
    const effectiveRootIndex = previewProbabilityRootIndex ?? probabilityRootIndex;
    const result = calculateProbabilities(effectiveRootIndex, graphData);

    // Find max probability among outcome nodes (good, ambivalent, existential)
    const outcomeNodes = result.nodes.filter(
      n => n.type === 'g' || n.type === 'a' || n.type === 'e'
    );
    const maxOutcomeProbability = Math.max(
      ...outcomeNodes.map(n => n.p),
      0 // Fallback to 0 if no outcome nodes
    );

    return { nodes: result.nodes, edges: result.edges, maxOutcomeProbability };
  }, [probabilityRootIndex, previewProbabilityRootIndex, graphData]);

  // Create document data for auto-save
  const documentData: DocumentData = useMemo(() => ({
    nodes: graphData.nodes,
    metadata: graphData.metadata,
  }), [graphData]);

  // Auto-save hook
  const { saveStatus, error: saveError, lastSavedAt } = useAutoSave({
    documentId: currentDocumentId,
    documentName,
    data: documentData,
    isAuthenticated: !!user,
    authLoading,
  });

  // Slider change handler
  const handleSliderChange = useCallback((nodeId: string, value: number) => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node =>
        node.id === nodeId ? { ...node, probability: value } : node
      );
      return { ...prev, nodes: updatedNodes };
    });
  }, []);

  // Slider change complete handler (for undo)
  const handleSliderChangeComplete = useCallback((nodeId: string) => {
    // Track analytics
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node && node.probability !== null) {
      analytics.trackSliderChange(nodeId, node.probability);
    }

    // Save to undo stack
    setUndoStack(prev => {
      const currentState = graphData.nodes;
      if (prev.length === 0 || JSON.stringify(prev[prev.length - 1]) !== JSON.stringify(currentState)) {
        return [...prev, currentState];
      }
      return prev;
    });
  }, [graphData.nodes]);

  // Node click handler - no longer changes probability root
  const handleNodeClick = useCallback((index: number) => {
    // Track analytics
    const nodeId = nodes[index]?.id || `node-${index}`;
    const nodeType = nodes[index]?.type || 'unknown';
    analytics.trackNodeClick(nodeId, nodeType);

    // Deselect any selected edge when clicking a node
    setSelectedEdgeIndex(-1);
  }, [nodes]);

  // Set probability root handler (for the "100" button)
  const handleSetProbabilityRoot = useCallback((index: number) => {
    setProbabilityRootIndex(prev => {
      const newIndex = index === prev ? startNodeIndex : index;

      // Track probability root change
      const newNodeId = newIndex === startNodeIndex ? null : (nodes[newIndex]?.id || `node-${newIndex}`);
      analytics.trackProbabilityRootChange(newNodeId);

      if (index === prev) {
        // Click same button again = reset to start
        return startNodeIndex;
      } else {
        return index;
      }
    });
  }, [nodes]);

  // Preview hover handlers for probability root button
  const handleSetProbabilityRootHoverStart = useCallback((index: number) => {
    setPreviewProbabilityRootIndex(index);
  }, []);

  const handleSetProbabilityRootHoverEnd = useCallback(() => {
    setPreviewProbabilityRootIndex(null);
  }, []);

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
    setProbabilityRootIndex(startNodeIndex);
    setSelectedNodeId(null);
  }, []);

  // Destination dot hover handlers
  const handleDestinationDotHover = useCallback((edgeIndex: number) => {
    setHoveredDestinationDotIndex(edgeIndex);
  }, []);

  const handleDestinationDotLeave = useCallback(() => {
    setHoveredDestinationDotIndex(-1);
  }, []);

  // Destination dot drag handlers
  const handleDestinationDotDragStart = useCallback((edgeIndex: number) => {
    setDraggingEdgeIndex(edgeIndex);
  }, []);

  const handleDestinationDotDragEnd = useCallback(() => {
    setDraggingEdgeIndex(-1);
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
            // Find which connection corresponds to this edge (by targetId or by targetX/targetY AND edge type)
            // We need to match by edge type (conn.type === edge.yn) to distinguish between stacked edges
            const isMatchingConnection = targetNodeId ?
              conn.targetId === targetNodeId && conn.type === edge.yn :
              conn.targetX === edge.targetX && conn.targetY === edge.targetY && conn.type === edge.yn;

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
            // Match by both targetId and edge type to distinguish between stacked edges
            if (conn.targetId === targetNodeId && conn.type === edge.yn) {
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
    const sourceGraphNode = graphData.nodes.find(n => n.id === sourceNode.id);
    const targetNodeId = edge.target !== undefined ? nodes[edge.target].id : undefined;

    // Get the sliderIndex from the GraphNode (if it's a question node)
    const sliderIndexToRemove = sourceGraphNode?.sliderIndex;

    setGraphData(prev => {
      let updatedNodes = prev.nodes.map(node => {
        if (node.id === sourceNode.id) {
          // Remove the connection
          const updatedConnections = node.connections.filter(conn => {
            // Match by edge type to distinguish between stacked edges
            const isMatchingConnection = targetNodeId ?
              conn.targetId === targetNodeId && conn.type === edge.yn :
              conn.targetX === edge.targetX && conn.targetY === edge.targetY && conn.type === edge.yn;
            return !isMatchingConnection;
          });

          // Handle node type conversion based on remaining connections
          let finalConnections = updatedConnections;
          let updatedType = node.type;
          let updatedSliderIndex = node.sliderIndex;

          if (updatedConnections.length === 0) {
            // No connections left: convert to AMBIVALENT outcome
            updatedType = 'a';
            updatedSliderIndex = null; // Clear sliderIndex
          } else if (updatedConnections.length === 1) {
            // One connection left: convert from QUESTION to INTERMEDIATE
            // Also convert the remaining connection from YES/NO to E100
            updatedType = 'i';
            updatedSliderIndex = null; // Clear sliderIndex
            finalConnections = updatedConnections.map(conn => ({
              ...conn,
              type: '-' as const,
              label: '',
            }));
          }

          return { ...node, connections: finalConnections, type: updatedType, sliderIndex: updatedSliderIndex, probability: updatedSliderIndex === null ? null : node.probability };
        }
        return node;
      });

      // Re-index remaining question nodes if we removed a question
      if (sliderIndexToRemove !== null && sliderIndexToRemove !== undefined) {
        updatedNodes = updatedNodes.map(n => {
          if (n.type === 'n' && n.sliderIndex !== null && n.sliderIndex > sliderIndexToRemove) {
            return { ...n, sliderIndex: n.sliderIndex - 1 };
          }
          return n;
        });
      }

      return { ...prev, nodes: updatedNodes };
    });

    setSelectedEdgeIndex(-1);
  }, [edges, nodes, graphData.nodes]);

  // Add arrow handler
  const handleAddArrow = useCallback((nodeId: string, direction: 'top' | 'bottom' | 'left' | 'right', nodeWidth?: number, nodeHeight?: number) => {
    // Find the node we're adding an arrow to
    const targetNode = graphData.nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    // Determine if this will convert to a question node
    const isIntermediateNode = targetNode.type === 'i';
    const willBecomeQuestion = isIntermediateNode && targetNode.connections.length === 1;

    // Calculate the next sliderIndex BEFORE state updates (for new question nodes)
    const existingQuestions = graphData.nodes.filter(n => n.type === 'n');
    const maxSliderIndex = existingQuestions.reduce(
      (max, n) => n.sliderIndex !== null && n.sliderIndex > max ? n.sliderIndex : max,
      -1
    );
    const newSliderIndex = maxSliderIndex + 1;

    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          // Calculate floating endpoint position based on direction
          // Use actual node dimensions if available, with fallbacks
          const width = nodeWidth ?? 145;
          const height = nodeHeight ?? 55;
          const desiredClearance = 50; // How far beyond the node edge we want the endpoint

          let targetX = node.position.x;
          let targetY = node.position.y;

          switch (direction) {
            case 'top':
              targetY -= (height / 2 + desiredClearance);
              break;
            case 'bottom':
              targetY += (height / 2 + desiredClearance);
              break;
            case 'left':
              targetX -= (width / 2 + desiredClearance);
              break;
            case 'right':
              targetX += (width / 2 + desiredClearance);
              break;
          }

          const isOutcomeNode = node.type === 'g' || node.type === 'a' || node.type === 'e';
          const isIntermediateNode = node.type === 'i';

          if (isOutcomeNode && node.connections.length === 0) {
            // Case: OUTCOME node with 0 connections -> add 1 E100 connection -> convert to INTERMEDIATE
            const newConnection = {
              type: '-' as const,
              targetX,
              targetY,
              label: '',
            };

            return { ...node, connections: [newConnection], type: 'i' as const };
          } else if (isIntermediateNode && node.connections.length === 1) {
            // Case: INTERMEDIATE node with 1 connection -> add YES/NO connections -> convert to QUESTION
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
            // CRITICAL: Assign sliderIndex and initialize probability
            return { ...node, connections: updatedConnections, type: 'n' as const, sliderIndex: newSliderIndex, probability: 50 };
          }
        }
        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });
  }, [graphData.nodes]);

  // Reset sliders to 50%
  const handleResetSliders = useCallback(() => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.type === 'n' && node.sliderIndex !== null) {
          return { ...node, probability: 50 };
        }
        return node;
      });
      return { ...prev, nodes: updatedNodes };
    });

    // Save to undo stack
    setUndoStack(prev => [...prev, graphData.nodes]);

    // Track analytics
    analytics.trackAction('reset');
  }, [graphData.nodes]);

  // Load author's estimates
  const handleLoadAuthorsEstimates = useCallback(() => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        // Find this node in defaultGraphData to get its original probability
        const defaultNode = defaultGraphData.nodes.find(n => n.id === node.id);
        if (node.type === 'n' && node.sliderIndex !== null && defaultNode) {
          return { ...node, probability: defaultNode.probability };
        }
        return node;
      });
      return { ...prev, nodes: updatedNodes };
    });

    // Save to undo stack
    setUndoStack(prev => [...prev, graphData.nodes]);

    // Track analytics
    analytics.trackAction('load_authors_estimates');
  }, [graphData.nodes]);

  // Undo handler
  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length > 1) {
        const newStack = [...prev];
        newStack.pop();
        const previousState = newStack[newStack.length - 1];

        setGraphData(current => ({
          ...current,
          nodes: previousState,
        }));

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

      // Helper function to check if there's a path from one node to another
      const hasPath = (fromId: string, toId: string, nodes: typeof updatedNodes): boolean => {
        if (fromId === toId) return true;

        const visited = new Set<string>();
        const queue = [fromId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (currentId === toId) return true;
          if (visited.has(currentId)) continue;

          visited.add(currentId);
          const currentNode = nodes.find(n => n.id === currentId);

          if (currentNode) {
            currentNode.connections.forEach(conn => {
              if (conn.targetId && !visited.has(conn.targetId)) {
                queue.push(conn.targetId);
              }
            });
          }
        }

        return false;
      };

      // Connect or push away floating arrow endpoints depending on whether it would create a cycle
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
              // Check if connecting this arrow to the dropped node would create a cycle
              // A cycle would occur if there's already a path from the dropped node to the source node
              const wouldCreateCycle = hasPath(nodeId, node.id, updatedNodes);

              if (wouldCreateCycle) {
                // Push the arrow away to avoid creating a cycle
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
              } else {
                // Connect the arrow to the dropped node (no cycle would be created)
                return {
                  ...connection,
                  targetId: nodeId,
                  targetX: undefined,
                  targetY: undefined,
                };
              }
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
      // Migrate old data: ensure all nodes have probability field
      const migratedNodes = data.data.nodes.map(node => {
        if (node.probability === undefined) {
          return {
            ...node,
            probability: node.type === 'n' ? 50 : null
          };
        }
        return node;
      });

      setCurrentDocumentId(data.id);
      setDocumentName(data.name);
      setGraphData({ metadata: data.data.metadata, nodes: migratedNodes });
      setProbabilityRootIndex(startNodeIndex); // Reset to start
    }
  }, []);

  const handleCreateNewDocument = useCallback((useTemplate: boolean) => {
    setCurrentDocumentId(null);
    setDocumentName('Untitled Document');

    if (useTemplate) {
      // Load the full template with all question nodes and outcomes
      setGraphData(defaultGraphData);
    } else {
      // Create an empty document with just a start node
      const emptyData = createEmptyDocumentData();
      setGraphData({
        metadata: emptyData.metadata,
        nodes: emptyData.nodes,
      });
    }

    setProbabilityRootIndex(startNodeIndex);
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
          targetX: x + 75, // Free-floating edge pointing to the right
          targetY: y,
          label: 'Always',
        },
      ],
      position: { x, y },
      sliderIndex: null, // Intermediate nodes don't have sliders
      probability: null, // Intermediate nodes don't have probability values
    };

    setGraphData(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

  }, [graphData]);

  const handleCreateNodeFromFloatingArrow = useCallback((edgeIndex: number, position: { x: number; y: number }) => {
    const edge = edges[edgeIndex];
    if (!edge || edge.target !== undefined) return; // Only handle floating arrows

    // Generate a unique ID for the new node
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newNodeId = `node_${timestamp}_${randomSuffix}`;

    // Create a new ambivalent outcome node at the specified position
    const newNode = {
      id: newNodeId,
      type: 'a' as const, // Ambivalent outcome node type
      title: '',
      connections: [], // Outcome nodes have no outgoing connections
      position: { x: position.x, y: position.y },
      sliderIndex: null,
      probability: null,
    };

    // Get the source node ID
    const sourceNodeId = nodes[edge.source].id;

    // Update graph: add new node and reconnect the floating arrow to it
    setGraphData(prev => {
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === sourceNodeId) {
          // Update the connection to point to the new node
          const updatedConnections = node.connections.map((conn) => {
            // Find the floating connection that matches this edge
            const isMatchingConnection =
              conn.targetX === edge.targetX &&
              conn.targetY === edge.targetY &&
              conn.type === edge.yn;

            if (isMatchingConnection) {
              // Connect to the new node
              return { ...conn, targetId: newNodeId, targetX: undefined, targetY: undefined };
            }
            return conn;
          });
          return { ...node, connections: updatedConnections };
        }
        return node;
      });

      return {
        ...prev,
        nodes: [...updatedNodes, newNode],
      };
    });
  }, [edges, nodes]);

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

    // Check if we need to reset probabilityRootIndex
    const deletedNodeIndex = nodes.findIndex(n => n.id === nodeId);
    const shouldResetSelection = deletedNodeIndex === probabilityRootIndex;

    // Use flushSync to ensure all state updates happen synchronously
    // This prevents intermediate renders with mismatched indices
    flushSync(() => {
      // Clear UI state
      setSelectedNodeId(null);
      setDeleteDialogOpen(false);
      setNodeToDelete(null);

      // Reset selection if needed
      if (shouldResetSelection) {
        setProbabilityRootIndex(startNodeIndex);
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
  }, [graphData, nodes, probabilityRootIndex]);

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
                { type: 'y' as const, targetX: n.position.x + 75, targetY: n.position.y - 50, label: 'Yes' },
                { type: 'n' as const, targetX: n.position.x + 75, targetY: n.position.y + 50, label: 'No' },
              ];
            } else if (connections.length === 1) {
              // Keep existing as YES, add NO
              connections[0] = { ...connections[0], type: 'y' as const };
              connections.push({ type: 'n' as const, targetX: n.position.x + 75, targetY: n.position.y + 50, label: 'No' });
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

            return { ...prev, nodes: finalNodes };
          }
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

  const handleContinueAnyway = useCallback(() => {
    setShowMobileWarning(false);
    setIsMobileView(true);
  }, []);

  return (
    <>
      {/* Mobile Warning - only shows on mobile devices */}
      {showMobileWarning && (
        <MobileWarning onContinue={handleContinueAnyway} />
      )}

      <div className="flex h-screen">
        {/* Sidebar - hide on mobile view */}
        {!isMobileView && (
          <Sidebar
        minOpacity={minOpacity}
        hoveredNodeIndex={hoveredNodeIndex}
        probabilityRootIndex={probabilityRootIndex}
        graphData={graphData}
        nodes={nodes}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onSliderChange={handleSliderChange}
        onSliderChangeComplete={handleSliderChangeComplete}
        onMinOpacityChange={handleMinOpacityChange}
        onSliderHover={handleNodeHover}
        onSliderLeave={handleNodeLeave}
        onResetSliders={handleResetSliders}
        onLoadAuthorsEstimates={handleLoadAuthorsEstimates}
        onResetNodePositions={handleResetNodePositions}
      />
        )}

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
                onEditorClose={handleEditorClose}
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
              {/* Show Sign In button when user is not logged in */}
              {!authLoading && !user && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm transition-colors font-medium"
                >
                  Sign In
                </button>
              )}
              {/* Show Share button - enabled for logged in users, disabled with tooltip for anonymous users */}
              {user && currentDocumentId ? (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors text-white font-medium"
                >
                  Share
                </button>
              ) : (
                <div className="relative">
                  <button
                    onMouseEnter={handleShareMouseEnter}
                    onMouseLeave={handleShareMouseLeave}
                    className="px-4 py-2 bg-gray-700 text-gray-400 rounded-md text-sm font-medium cursor-default"
                  >
                    Share
                  </button>
                  {showShareTooltip && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                      Sign in to share your scenarios
                    </div>
                  )}
                </div>
              )}
              <Link
                href="/about"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
              >
                About
              </Link>
              <SettingsMenu />
            </div>
          </div>
        </header>

        {/* Flowchart */}
        <div className="flex-1 min-h-0">
          <Flowchart
            nodes={nodes}
            edges={edges}
            graphData={graphData}
            probabilityRootIndex={probabilityRootIndex}
            hoveredNodeIndex={hoveredNodeIndex}
            selectedEdgeIndex={selectedEdgeIndex}
            selectedNodeId={selectedNodeId}
            hoveredDestinationDotIndex={hoveredDestinationDotIndex}
            draggingEdgeIndex={draggingEdgeIndex}
            boldPaths={true}
            transparentPaths={minOpacity < 100}
            minOpacity={minOpacity}
            maxOutcomeProbability={maxOutcomeProbability}
            zoom={zoom}
            resetTrigger={resetTrigger}
            onZoomChange={handleZoomChange}
            onNodeClick={handleNodeClick}
            onSetProbabilityRoot={handleSetProbabilityRoot}
            onSetProbabilityRootHoverStart={handleSetProbabilityRootHoverStart}
            onSetProbabilityRootHoverEnd={handleSetProbabilityRootHoverEnd}
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
            onDestinationDotHover={handleDestinationDotHover}
            onDestinationDotLeave={handleDestinationDotLeave}
            onDestinationDotDragStart={handleDestinationDotDragStart}
            onDestinationDotDragEnd={handleDestinationDotDragEnd}
            onCreateNodeFromFloatingArrow={handleCreateNodeFromFloatingArrow}
            editorCloseTimestampRef={editorCloseTimestampRef}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={currentDocumentId}
        initialIsPublic={false}
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
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
