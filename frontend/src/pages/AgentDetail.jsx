import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLibraryAgent, adoptAgent } from '../services/library.service';
import { fetchWorkspaces } from '../services/auth.service';
import ExecutionGraph from '../components/ExecutionGraph';

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [mode, setMode] = useState('use');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fallback, setFallback] = useState('');
  const [error, setError] = useState('');
  const [adopting, setAdopting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getLibraryAgent(id)
      .then((a) => {
        setAgent(a);
        setName(a.name);
        setDescription(a.description);
        setFallback(a.fallback);
      })
      .catch(() => setError('Could not load the agent.'));
    fetchWorkspaces()
      .then((list) => {
        setWorkspaces(list);
        if (list.length > 0) setWorkspaceId(list[0]._id);
      })
      .catch(() => setError('Could not load workspaces.'));
  }, [id]);

  async function handleAdopt(e) {
    e.preventDefault();
    setError('');
    setAdopting(true);
    try {
      await adoptAgent(id, {
        workspaceId,
        mode,
        overrides: mode === 'customize' ? { name, description, fallback } : undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not adopt the agent.');
    } finally {
      setAdopting(false);
    }
  }

  if (!agent) return <div className="p-6">{error || 'Loading…'}</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold">{agent.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{agent.description}</p>
      <p className="mt-1 text-xs text-gray-400">Category: {agent.category}</p>
      <Link className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white" to={`/chat/${agent._id}`}>Chat with this agent</Link>
      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <h2 className="mt-6 font-semibold">What it can do</h2>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {agent.capabilities.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold">Tools</h2>
      <ul className="mt-2 space-y-1">
        {agent.tools.map((t) => (
          <li key={t.name} className="text-sm">
            <span className="font-medium">{t.name}</span> ({t.toolkit}) — {t.description}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold">Workflow</h2>
      <div className="mt-2 rounded border bg-white">
        <ExecutionGraph workflow={agent.workflow} />
      </div>

      <h2 className="mt-6 font-semibold">Adopt this agent</h2>
      <form onSubmit={handleAdopt} className="mt-2 space-y-3 rounded border bg-white p-4">
        <label className="block text-sm font-medium">Workspace</label>
        <select className="w-full rounded border px-3 py-2" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
          {workspaces.map((w) => (
            <option key={w._id} value={w._id}>{w.name}</option>
          ))}
        </select>
        <div className="flex gap-4 text-sm">
          <label>
            <input type="radio" checked={mode === 'use'} onChange={() => setMode('use')} /> Use directly
          </label>
          <label>
            <input type="radio" checked={mode === 'customize'} onChange={() => setMode('customize')} /> Customize it
          </label>
        </div>
        {mode === 'customize' && (
          <>
            <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
            <textarea className="w-full rounded border px-3 py-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            <textarea className="w-full rounded border px-3 py-2" rows={2} value={fallback} onChange={(e) => setFallback(e.target.value)} placeholder="Fallback behaviour" />
          </>
        )}
        <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" type="submit" disabled={adopting}>
          {adopting ? 'Adopting…' : mode === 'use' ? 'Adopt agent' : 'Adopt customized agent'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Or <Link className="text-blue-600" to="/studio">build one from scratch</Link>.
      </p>
    </div>
  );
}
