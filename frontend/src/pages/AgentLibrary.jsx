import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLibraryAgents } from '../services/library.service';

const CATEGORIES = ['all', 'support', 'sales', 'scheduling', 'faq'];

export default function AgentLibrary() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    listLibraryAgents({
      search: search || undefined,
      category: category === 'all' ? undefined : category,
    })
      .then(setAgents)
      .catch(() => setError('Could not load the library.'));
  }, [search, category]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold">Agent Library</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ready-made agents. Use one directly, customize it, or build your own from scratch.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <Link key={a._id} to={`/library/${a._id}`} className="rounded border bg-white p-4 hover:border-black">
            <h2 className="font-semibold">{a.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{a.description}</p>
            <p className="mt-2 text-xs text-gray-400">
              {a.category} · {a.capabilities.slice(0, 3).join(', ')}
            </p>
          </Link>
        ))}
        {agents.length === 0 && <p className="text-sm text-gray-500">No agents match.</p>}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        Nothing fits? <Link className="text-blue-600" to="/studio">Build from scratch in Prompt Studio</Link>.
      </p>
    </div>
  );
}
