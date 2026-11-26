import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listBlueprints, deleteBlueprint } from '../services/blueprint.service';

export default function Blueprints() {
  const [blueprints, setBlueprints] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listBlueprints().then(setBlueprints).catch(() => setError('Could not load blueprints.'));
  }, []);

  async function handleDelete(id) {
    try {
      await deleteBlueprint(id);
      setBlueprints(blueprints.filter((b) => b._id !== id));
    } catch {
      setError('Could not delete the blueprint.');
    }
  }

  return (
    <div className="nx-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="nx-eyebrow">Designs</p>
          <h1 className="nx-title mt-2">Blueprints</h1>
          <p className="nx-subtitle">Review structured agent specs before they become runnable projects.</p>
        </div>
        <Link className="nx-btn-primary shrink-0" to="/studio">New blueprint</Link>
      </header>

      {error && <p className="nx-alert-error mt-6">{error}</p>}

      <ul className="mt-8 space-y-2">
        {blueprints.map((b) => (
          <li key={b._id} className="nx-row items-start sm:items-center">
            <div className="min-w-0 flex-1">
              <Link className="font-display text-lg font-bold tracking-tight text-ink hover:text-signal" to={`/blueprints/${b._id}`}>
                {b.name}
              </Link>
              <p className="mt-1 text-sm text-ink-muted">{b.purpose}</p>
              <p className="mt-2"><span className="nx-chip">{b.status}</span></p>
            </div>
            <button type="button" onClick={() => handleDelete(b._id)} className="nx-btn-danger !py-2 !text-xs uppercase tracking-[0.12em]">
              Delete
            </button>
          </li>
        ))}
        {blueprints.length === 0 && (
          <li className="border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
            No blueprints yet — create one in{' '}
            <Link className="nx-link" to="/studio">Prompt Studio</Link>.
          </li>
        )}
      </ul>
    </div>
  );
}
