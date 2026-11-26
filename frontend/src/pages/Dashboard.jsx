import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWorkspaces, createWorkspace } from '../services/auth.service';
import { listUserAgents } from '../services/library.service';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces().then(setWorkspaces).catch(() => setError('Could not load workspaces.'));
    listUserAgents().then(setAgents).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const ws = await createWorkspace(name, '');
      setWorkspaces([ws, ...workspaces]);
      setName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create workspace.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="nx-page space-y-12">
      <header>
        <p className="nx-eyebrow">Command center</p>
        <h1 className="nx-title mt-2">Welcome, {user?.name}</h1>
        <p className="nx-subtitle">
          Your agents and workspaces in one place. Adopt from the library or design a new blueprint in Studio.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/studio" className="nx-btn-primary">Open Studio</Link>
          <Link to="/library" className="nx-btn-secondary">Browse Library</Link>
        </div>
      </header>

      {error && <p className="nx-alert-error">{error}</p>}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="nx-eyebrow">Fleet</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Your agents</h2>
          </div>
          <span className="nx-chip">{agents.length} live</span>
        </div>
        <ul className="space-y-2">
          {agents.map((a) => (
            <li key={a._id}>
              <div className="nx-row">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{a.name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {a.category} · {a.status}
                  </p>
                </div>
                <Link className="nx-btn-secondary !py-2 !text-xs uppercase tracking-[0.12em]" to={`/chat/${a._id}`}>
                  Chat
                </Link>
              </div>
            </li>
          ))}
          {agents.length === 0 && (
            <li className="border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
              No agents yet — adopt one from the{' '}
              <Link className="nx-link" to="/library">Library</Link> or create one in{' '}
              <Link className="nx-link" to="/studio">Prompt Studio</Link>.
            </li>
          )}
        </ul>
      </section>

      <section>
        <div className="mb-4">
          <p className="nx-eyebrow">Organization</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Workspaces</h2>
        </div>
        <ul className="space-y-2">
          {workspaces.map((w) => (
            <li key={w._id} className="nx-row">
              <span className="font-semibold text-ink">{w.name}</span>
              <span className="nx-chip">Workspace</span>
            </li>
          ))}
          {workspaces.length === 0 && (
            <li className="border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
              No workspaces yet. Create your first below.
            </li>
          )}
        </ul>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="nx-input flex-1"
            placeholder="New workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="nx-btn-primary shrink-0" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </section>
    </div>
  );
}
