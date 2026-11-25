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

  useEffect(() => {
    fetchWorkspaces().then(setWorkspaces).catch(() => setError('Could not load workspaces.'));
    listUserAgents().then(setAgents).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const ws = await createWorkspace(name, '');
      setWorkspaces([ws, ...workspaces]);
      setName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create workspace.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold">Welcome, {user?.name}</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <h2 className="mt-6 font-semibold">Your agents</h2>
      <ul className="mt-2 space-y-2">
        {agents.map((a) => (
          <li key={a._id} className="flex items-center justify-between rounded border bg-white px-4 py-2">
            <div>
              <span className="font-medium">{a.name}</span>
              <span className="ml-2 text-sm text-gray-500">{a.category} · {a.status}</span>
            </div>
            <Link className="text-sm text-blue-600" to={`/chat/${a._id}`}>Chat →</Link>
          </li>
        ))}
        {agents.length === 0 && (
          <li className="text-sm text-gray-500">
            No agents yet — adopt one from the <a className="text-blue-600" href="/library">Library</a> or create one in Prompt Studio.
          </li>
        )}
      </ul>

      <h2 className="mt-6 font-semibold">Your workspaces</h2>
      <ul className="mt-2 space-y-2">
        {workspaces.map((w) => (
          <li key={w._id} className="rounded border bg-white px-4 py-2">{w.name}</li>
        ))}
        {workspaces.length === 0 && <li className="text-sm text-gray-500">No workspaces yet.</li>}
      </ul>
      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="New workspace name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">Create</button>
      </form>
    </div>
  );
}
