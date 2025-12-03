import React, { useMemo } from 'react';
import ReactFlow, { MiniMap, Controls, Background, BackgroundVariant, Panel } from 'reactflow';

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
}

const nodeTypes = { 
  // custom node types if needed
};

const ReactFlowRenderer: React.FC<ReactFlowRendererProps> = ({ nodes, edges }) => {
  const initialNodes = useMemo(() => nodes, [nodes]);
  const initialEdges = useMemo(() => edges, [edges]);

  if (!initialNodes || !initialEdges) {
    return <div className="p-4 text-center text-slate-500">Invalid concept map data.</div>;
  }

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-50 dark:bg-slate-900">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        className="react-flow-renderer"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-right" className="p-2 bg-white/80 dark:bg-black/80 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500">
          Drag nodes to rearrange
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default ReactFlowRenderer;
