'use client';

import { useState } from 'react';
import type { GraphNode, NodeConnection, EdgeType } from '@/lib/types';
import { EdgeType as ET } from '@/lib/types';

interface ConnectionEditorProps {
  selectedNode: GraphNode | null;
  allNodes: GraphNode[];
  onUpdateConnectionLabel: (nodeId: string, connectionIndex: number, newLabel: string) => void;
  onUpdateConnectionTarget: (nodeId: string, connectionIndex: number, newTargetId: string) => void;
}

export default function ConnectionEditor({
  selectedNode,
  allNodes,
  onUpdateConnectionLabel,
  onUpdateConnectionTarget,
}: ConnectionEditorProps) {
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');

  if (!selectedNode) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
        Select a node to edit its connections
      </div>
    );
  }

  const handleLabelEditStart = (index: number, currentLabel: string) => {
    setEditingLabelIndex(index);
    setEditLabelValue(currentLabel);
  };

  const handleLabelEditSave = (connectionIndex: number) => {
    if (editLabelValue.trim() && editLabelValue !== selectedNode.connections[connectionIndex].label) {
      onUpdateConnectionLabel(selectedNode.id, connectionIndex, editLabelValue.trim());
    }
    setEditingLabelIndex(null);
  };

  const handleLabelEditCancel = () => {
    setEditingLabelIndex(null);
    setEditLabelValue('');
  };

  const getEdgeTypeLabel = (type: EdgeType): string => {
    switch (type) {
      case ET.YES:
        return 'YES';
      case ET.NO:
        return 'NO';
      case ET.ALWAYS:
        return 'ALWAYS';
      default:
        return type;
    }
  };

  const getEdgeTypeColor = (type: EdgeType): string => {
    switch (type) {
      case ET.YES:
        return 'text-green-400';
      case ET.NO:
        return 'text-red-400';
      case ET.ALWAYS:
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 max-h-[400px] overflow-y-auto">
      <h3 className="text-sm font-semibold text-white mb-3">
        Connections from: <span className="text-purple-400">{selectedNode.title}</span>
      </h3>

      {selectedNode.connections.length === 0 ? (
        <p className="text-sm text-gray-400">No outgoing connections</p>
      ) : (
        <div className="space-y-3">
          {selectedNode.connections.map((connection, index) => {
            const targetNode = allNodes.find(n => n.id === connection.targetId);
            const isEditingLabel = editingLabelIndex === index;

            return (
              <div key={index} className="bg-gray-800/50 border border-gray-700 rounded p-3 space-y-2">
                {/* Connection Type Badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${getEdgeTypeColor(connection.type)}`}>
                    {getEdgeTypeLabel(connection.type)}
                  </span>
                  <span className="text-xs text-gray-500">→</span>
                  <span className="text-xs text-gray-300">{targetNode?.title || connection.targetId}</span>
                </div>

                {/* Label Editor */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Label:</label>
                  {isEditingLabel ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLabelEditSave(index);
                          } else if (e.key === 'Escape') {
                            handleLabelEditCancel();
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleLabelEditSave(index)}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleLabelEditCancel}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 px-2 py-1 text-xs bg-gray-700/50 rounded text-gray-200">
                        {connection.label}
                      </span>
                      <button
                        onClick={() => handleLabelEditStart(index, connection.label)}
                        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Target Selector */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Node:</label>
                  <select
                    value={connection.targetId}
                    onChange={(e) => onUpdateConnectionTarget(selectedNode.id, index, e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
                  >
                    {allNodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.title} ({node.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
