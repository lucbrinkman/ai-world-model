import { Node as NodeType, Edge as EdgeType, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/types';
import { questionNodeIndices } from '@/lib/graphData';
import NodeComponent from './Node';
import EdgeComponent from './Edge';
import { useRef, useEffect, useState } from 'react';

interface FlowchartProps {
  nodes: NodeType[];
  edges: EdgeType[];
  sliderValues: number[];
  selectedNodeIndex: number;
  hoveredNodeIndex: number;
  boldPaths: boolean;
  transparentPaths: boolean;
  minOpacity: number;
  onNodeClick: (index: number) => void;
  onNodeHover: (index: number) => void;
  onNodeLeave: () => void;
}

export default function Flowchart({
  nodes,
  edges,
  sliderValues,
  selectedNodeIndex,
  hoveredNodeIndex,
  boldPaths,
  transparentPaths,
  minOpacity,
  onNodeClick,
  onNodeHover,
  onNodeLeave,
}: FlowchartProps) {
  // Create refs for all nodes
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nodeBounds, setNodeBounds] = useState<DOMRect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update node bounds whenever nodes change or window resizes
  useEffect(() => {
    const updateBounds = () => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const bounds = nodeRefs.current.map((ref) => {
        if (!ref) return new DOMRect();
        const rect = ref.getBoundingClientRect();
        // Convert to container-relative coordinates
        return new DOMRect(
          rect.left - containerRect.left,
          rect.top - containerRect.top,
          rect.width,
          rect.height
        );
      });
      setNodeBounds(bounds);
    };

    // Initial update
    updateBounds();

    // Update on window resize
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [nodes]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
      <div
        ref={containerRef}
        className="relative bg-background"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
        }}
      >
        {/* SVG for edges/arrows */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        >
          {edges.map((edge, index) => {
            const sourceNode = nodes[edge.source];
            const targetNode = nodes[edge.target];

            // Get slider value for this edge (if source is a question node)
            const sliderIndex = questionNodeIndices.indexOf(edge.source);
            const sliderValue = sliderIndex >= 0 ? sliderValues[sliderIndex] : null;

            // Get bounding boxes for source and target
            const sourceBounds = nodeBounds[edge.source];
            const targetBounds = nodeBounds[edge.target];

            return (
              <EdgeComponent
                key={index}
                edge={edge}
                sourceNode={sourceNode}
                targetNode={targetNode}
                sliderValue={sliderValue}
                transparentPaths={transparentPaths}
                boldPaths={boldPaths}
                minOpacity={minOpacity}
                sourceBounds={sourceBounds}
                targetBounds={targetBounds}
              />
            );
          })}
        </svg>

        {/* Nodes (HTML divs positioned absolutely) */}
        {nodes.map((node) => (
          <NodeComponent
            key={node.index}
            ref={(el) => (nodeRefs.current[node.index] = el)}
            node={node}
            isSelected={node.index === selectedNodeIndex}
            isHovered={node.index === hoveredNodeIndex}
            transparentPaths={transparentPaths}
            minOpacity={minOpacity}
            onClick={() => onNodeClick(node.index)}
            onMouseEnter={() => onNodeHover(node.index)}
            onMouseLeave={onNodeLeave}
          />
        ))}
      </div>
    </div>
  );
}
