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
    } catch (err) {
      setError('Could not delete the blueprint.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Your blueprints</h1>
        <Link className="rounded bg-black px-4 py-2 text-sm text-white" to="/studio">New blueprint</Link>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 space-y-2">
        {blueprints.map((b) => (
          <li key={b._id} className="flex items-center justify-between rounded border bg-white px-4 py-3">
            <div>
              <Link className="font-semibold text-blue-600" to={`/blueprints/${b._id}`}>{b.name}</Link>
              <p className="text-sm text-gray-500">{b.purpose}</p>
              <p className="text-xs text-gray-400">Status: {b.status}</p>
            </div>
            <button onClick={() => handleDelete(b._id)} className="rounded border px-3 py-1 text-sm text-red-600">Delete</button>
          </li>
        ))}
        {blueprints.length === 0 && <li className="text-sm text-gray-500">No blueprints yet — create one in Prompt Studio.</li>}
      </ul>
    </div>
  );
}
