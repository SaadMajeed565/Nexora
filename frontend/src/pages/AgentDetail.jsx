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

  if (!agent) {
    return (
      <div className="nx-page">
        <p className="text-sm text-ink-muted">{error || 'Loading agent…'}</p>
      </div>
    );
  }

  return (
    <div className="nx-page space-y-10">
      <header>
        <p className="nx-eyebrow">{agent.category}</p>
        <h1 className="nx-title mt-2">{agent.name}</h1>
        <p className="nx-subtitle">{agent.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="nx-btn-primary" to={`/chat/${agent._id}`}>Chat with agent</Link>
          <Link className="nx-btn-secondary" to="/library">Back to library</Link>
        </div>
        {error && <p className="nx-alert-error mt-4">{error}</p>}
      </header>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Capabilities</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {agent.capabilities.map((c) => (
            <li key={c} className="border-l-2 border-signal pl-3 text-sm text-ink-muted">
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Tools</h2>
        <ul className="mt-3 space-y-2">
          {agent.tools.map((t) => (
            <li key={t.name} className="border-b border-line/70 pb-2 text-sm last:border-0">
              <span className="font-semibold text-ink">{t.name}</span>
              <span className="text-ink-muted"> · {t.toolkit}</span>
              <p className="mt-0.5 text-ink-muted">{t.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Workflow</h2>
        <div className="nx-panel mt-3 overflow-hidden">
          <ExecutionGraph workflow={agent.workflow} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Adopt this agent</h2>
        <p className="mt-1 text-sm text-ink-muted">Attach it to a workspace as-is, or customize before adopting.</p>
        <form onSubmit={handleAdopt} className="nx-panel mt-4 space-y-4 p-6">
          <div>
            <label className="nx-label" htmlFor="workspace">Workspace</label>
            <select
              id="workspace"
              className="nx-select"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="radio"
                className="accent-[var(--signal)]"
                checked={mode === 'use'}
                onChange={() => setMode('use')}
              />
              Use directly
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="radio"
                className="accent-[var(--signal)]"
                checked={mode === 'customize'}
                onChange={() => setMode('customize')}
              />
              Customize
            </label>
          </div>
          {mode === 'customize' && (
            <div className="space-y-3 border-t border-line pt-4">
              <input className="nx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
              <textarea className="nx-textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
              <textarea className="nx-textarea" rows={2} value={fallback} onChange={(e) => setFallback(e.target.value)} placeholder="Fallback behaviour" />
            </div>
          )}
          <button className="nx-btn-primary" type="submit" disabled={adopting || !workspaceId}>
            {adopting ? 'Adopting…' : mode === 'use' ? 'Adopt agent' : 'Adopt customized agent'}
          </button>
        </form>
        <p className="mt-4 text-sm text-ink-muted">
          Or <Link className="nx-link" to="/studio">build one from scratch</Link>.
        </p>
      </section>
    </div>
  );
}
