import React, { useMemo, useCallback } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  BackgroundVariant, 
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection
} from 'reactflow';

interface Node {
  id: string;
  position: { x: number; y: number };
  data: { label: string };
  // other reactflow node properties
}

interface Edge {
  id: string;
  source: string;
  target: string;
  // other reactflow edge properties
}

interface ReactFlowRendererProps {
  nodes: Node[];
  edges: Edge[];
  editable?: boolean;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

const nodeTypes = { 
  // custom node types if needed
};

const ReactFlowRenderer: React.FC<ReactFlowRendererProps> = ({ 
  nodes, 
  edges, 
  editable = false,
  onNodesChange,
  onEdgesChange 
}) => {
  const [flowNodes, setFlowNodes, onNodesChangeInternal] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChangeInternal] = useEdgesState(edges);

  // Update internal state when props change
  React.useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  // Notify parent of node changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    if (editable && onNodesChange) {
      // Delay to get updated state
      setTimeout(() => {
        setFlowNodes((currentNodes) => {
          onNodesChange(currentNodes);
          return currentNodes;
        });
      }, 0);
    }
  }, [editable, onNodesChange, onNodesChangeInternal, setFlowNodes]);

  // Notify parent of edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    if (editable && onEdgesChange) {
      setTimeout(() => {
        setFlowEdges((currentEdges) => {
          onEdgesChange(currentEdges);
          return currentEdges;
        });
      }, 0);
    }
  }, [editable, onEdgesChange, onEdgesChangeInternal, setFlowEdges]);

  // Handle new connections
  const onConnect = useCallback((params: Connection) => {
    if (editable) {
      setFlowEdges((eds) => {
        const newEdges = addEdge({ ...params, type: 'smoothstep' }, eds);
        if (onEdgesChange) {
          onEdgesChange(newEdges);
        }
        return newEdges;
      });
    }
  }, [editable, onEdgesChange, setFlowEdges]);

  if (!flowNodes || !flowEdges) {
    return <div className="p-4 text-center text-slate-500">Invalid concept map data.</div>;
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-50 dark:bg-slate-900">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        fitView
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        className="react-flow-renderer"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-right" className="p-2 bg-white/80 dark:bg-black/80 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500">
          {editable ? 'Editing: Drag nodes, connect edges' : 'Drag nodes to rearrange'}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ReactFlowRenderer;
