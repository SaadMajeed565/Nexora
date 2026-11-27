import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function ExecutionGraph({ workflow }) {
  const nodes = workflow.map((step, i) => ({
    id: step.id,
    position: { x: 220, y: i * 108 },
    style: {
      border: '1px solid #cfd6d1',
      borderRadius: 0,
      background: '#f7f8f6',
      color: '#0c1210',
      fontSize: 12,
      fontFamily: 'Manrope, sans-serif',
      fontWeight: 600,
      padding: '10px 14px',
      width: 260,
      boxShadow: '0 18px 40px -28px rgba(12, 18, 16, 0.3)',
    },
    data: {
      label: `${step.name} (${step.type}${step.tool ? ` · ${step.tool}` : ''})`,
    },
  }));

  const edges = [];
  const exists = (id) => id && workflow.some((s) => s.id === id);
  workflow.forEach((step, i) => {
    if (step.branches?.length) {
      // Decision step: one labelled edge per branch case, plus the else
      // edge — this is what makes the fork (and the rejoin) visible.
      step.branches.forEach((branch, j) => {
        if (exists(branch.goto)) {
          edges.push({
            id: `${step.id}-branch${j}->${branch.goto}`,
            source: step.id,
            target: branch.goto,
            label: branch.when,
            animated: true,
            style: { stroke: '#0f6b52', strokeWidth: 1.5 },
            labelStyle: { fontSize: 10, fontWeight: 600, fill: '#0f6b52' },
          });
        }
      });
      if (exists(step.else)) {
        edges.push({
          id: `${step.id}-else->${step.else}`,
          source: step.id,
          target: step.else,
          label: 'else',
          animated: true,
          style: { stroke: '#b45309', strokeWidth: 1.5, strokeDasharray: '5 4' },
          labelStyle: { fontSize: 10, fontWeight: 600, fill: '#b45309' },
        });
      }
      return;
    }
    const target = step.next || workflow[i + 1]?.id;
    if (exists(target)) {
      edges.push({
        id: `${step.id}->${target}`,
        source: step.id,
        target,
        animated: true,
        style: { stroke: '#0f6b52', strokeWidth: 1.5 },
      });
    }
  });

  return (
    <div style={{ height: 320 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#cfd6d1" gap={18} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
