import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Visual Flow Validation (FR-2.3): the blueprint workflow as a node graph.
export default function ExecutionGraph({ workflow }) {
  const nodes = workflow.map((step, i) => ({
    id: step.id,
    position: { x: 250, y: i * 110 },
    data: {
      label: `${step.name} (${step.type}${step.tool ? ` · ${step.tool}` : ''})`,
    },
  }));

  const edges = [];
  workflow.forEach((step, i) => {
    const target = step.next || workflow[i + 1]?.id;
    if (target && workflow.some((s) => s.id === target)) {
      edges.push({ id: `${step.id}->${target}`, source: step.id, target, animated: true });
    }
  });

  return (
    <div style={{ height: 320 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
