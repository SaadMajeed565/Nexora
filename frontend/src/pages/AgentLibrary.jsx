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
    <div className="nx-page">
      <header>
        <p className="nx-eyebrow">Catalog</p>
        <h1 className="nx-title mt-2">Agent Library</h1>
        <p className="nx-subtitle">
          Production-ready agents. Use one directly, customize it, or start from a blank blueprint.
        </p>
      </header>

      {error && <p className="nx-alert-error mt-6">{error}</p>}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          className="nx-input flex-1"
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="nx-select sm:w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <Link
            key={a._id}
            to={`/library/${a._id}`}
            className="group border border-line bg-surface-raised/70 p-5 shadow-soft transition hover:border-ink/30 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink group-hover:text-signal">
                {a.name}
              </h2>
              <span className="nx-chip shrink-0">{a.category}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{a.description}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted/80">
              {a.capabilities.slice(0, 3).join(' · ')}
            </p>
          </Link>
        ))}
        {agents.length === 0 && (
          <p className="col-span-full border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
            No agents match.
          </p>
        )}
      </div>

      <p className="mt-10 text-sm text-ink-muted">
        Nothing fits? <Link className="nx-link" to="/studio">Build from scratch in Prompt Studio</Link>.
      </p>
    </div>
  );
}
