import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getBlueprint, updateBlueprint } from '../services/blueprint.service';
import { matchAgents } from '../services/library.service';
import ExecutionGraph from '../components/ExecutionGraph';

const EDITABLE = ['name', 'purpose', 'tools', 'workflow', 'triggers', 'fallback'];

function pickEditable(bp) {
  const out = {};
  EDITABLE.forEach((k) => {
    out[k] = bp[k];
  });
  return out;
}

export default function BlueprintReview() {
  const { id } = useParams();
  const [blueprint, setBlueprint] = useState(null);
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [matches, setMatches] = useState([]);
  const [matchError, setMatchError] = useState('');

  useEffect(() => {
    getBlueprint(id)
      .then((bp) => {
        setBlueprint(bp);
        setJson(JSON.stringify(pickEditable(bp), null, 2));
      })
      .catch(() => setError('Could not load the blueprint.'));
    matchAgents(id)
      .then(setMatches)
      .catch(() => setMatchError('Could not load matches.'));
  }, [id]);

  async function handleSave() {
    setError('');
    setSaved('');
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      setError('The JSON is not valid. Fix it and try again.');
      return;
    }
    try {
      const updated = await updateBlueprint(id, parsed);
      setBlueprint(updated);
      setSaved('Saved. Status: reviewed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the blueprint.');
    }
  }

  if (!blueprint) return <div className="p-6">{error || 'Loading…'}</div>;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-bold">{blueprint.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{blueprint.purpose}</p>
      <p className="mt-1 text-xs text-gray-400">Status: {blueprint.status}</p>
      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">{saved}</p>}

      <h2 className="mt-6 font-semibold">Workflow</h2>
      <div className="mt-2 rounded border bg-white">
        <ExecutionGraph workflow={blueprint.workflow} />
      </div>

      <h2 className="mt-6 font-semibold">Tools</h2>
      <ul className="mt-2 space-y-1">
        {blueprint.tools.map((t) => (
          <li key={t.name} className="text-sm">
            <span className="font-medium">{t.name}</span> ({t.toolkit}) — {t.description}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold">Triggers</h2>
      <p className="mt-1 text-sm">{blueprint.triggers.join(', ')}</p>
      <h2 className="mt-4 font-semibold">Fallback</h2>
      <p className="mt-1 text-sm">{blueprint.fallback}</p>

      <h2 className="mt-6 font-semibold">Matching library agents</h2>
      {matchError && <p className="mt-1 text-sm text-red-600">{matchError}</p>}
      {matches.length === 0 && !matchError && <p className="mt-1 text-sm text-gray-500">No matches yet.</p>}
      <ul className="mt-2 space-y-2">
        {matches.map((m) => (
          <li key={m.agent._id} className="flex items-center justify-between rounded border bg-white px-4 py-2">
            <div>
              <Link className="font-semibold text-blue-600" to={`/library/${m.agent._id}`}>{m.agent.name}</Link>
              <p className="text-xs text-gray-400">
                tools {m.match.breakdown.tools} · keywords {m.match.breakdown.keywords} · triggers {m.match.breakdown.triggers} · category {m.match.breakdown.category}
              </p>
            </div>
            <span className="text-lg font-bold">{m.match.score}%</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-semibold">Edit blueprint (JSON)</h2>
      <div className="mt-2 overflow-hidden rounded border">
        <Editor height="380px" defaultLanguage="json" value={json} onChange={(v) => setJson(v || '')} />
      </div>
      <button onClick={handleSave} className="mt-3 rounded bg-black px-4 py-2 text-white">Save changes</button>
    </div>
  );
}
