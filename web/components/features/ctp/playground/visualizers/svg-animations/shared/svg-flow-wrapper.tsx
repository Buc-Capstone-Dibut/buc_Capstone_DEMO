"use client";

import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Position,
  Handle,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface SVGWrapperNodeData extends Record<string, unknown> {
  Visualizer: React.ComponentType<any>;
  data: any;
}

const SVGWrapperNode = ({ data }: { data: SVGWrapperNodeData }) => {
  const { Visualizer, data: visualizerData } = data;
  return (
    <div className="relative pointer-events-none" style={{ width: 800, height: 500 }}>
       {/*
         The SVG component bounds.
         pointer-events-none lets ReactFlow handle panning/zooming over the empty areas,
         but we might need to enable pointer-events on specific interactive elements inside the SVG if needed.
       */}
       <div className="absolute inset-0 flex items-center justify-center">
         <Visualizer data={visualizerData} />
       </div>

       {/* Hidden handles to satisfy ReactFlow node requirements if we ever wanted to connect them */}
       <Handle type="target" position={Position.Top} className="opacity-0" />
       <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { svgWrapper: SVGWrapperNode };

interface SVGFlowWrapperProps {
  Visualizer: React.ComponentType<any>;
  data: any;
}

export function SVGFlowWrapper({ Visualizer, data }: SVGFlowWrapperProps) {

  // We only need one node that takes up a large central area to host the SVG
  const initialNodes: Node<SVGWrapperNodeData>[] = useMemo(() => [
    {
      id: 'svg-canvas',
      type: 'svgWrapper',
      position: { x: 0, y: 0 },
      data: { Visualizer, data },
      draggable: false,
      selectable: false,
    }
  ], [Visualizer, data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  // Update node data when props change (like the `step` in the simulation)
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === 'svg-canvas') {
          return { ...n, data: { ...n.data, data } };
        }
        return n;
      })
    );
  }, [data, setNodes]);

  return (
    <div className="h-full w-full bg-muted/5 border border-border/40 rounded-xl relative overflow-hidden flex flex-col">
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 2.0 }}
        attributionPosition="bottom-right"
        className="bg-transparent"
        minZoom={0.2}
        maxZoom={4.0}
        panOnScroll={true}
        zoomOnScroll={true}
      >
        <Background gap={24} size={1} className="opacity-40 pointer-events-none" />
        <Controls showInteractive={false} className="opacity-80 hover:opacity-100 transition-opacity" />
      </ReactFlow>
    </div>
  );
}
