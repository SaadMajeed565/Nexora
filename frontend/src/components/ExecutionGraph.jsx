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
  workflow.forEach((step, i) => {
    const target = step.next || workflow[i + 1]?.id;
    if (target && workflow.some((s) => s.id === target)) {
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
