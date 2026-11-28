import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getBlueprint, updateBlueprint } from '../services/blueprint.service';
import { matchAgents, createAgentFromBlueprint, listUserAgents } from '../services/library.service';
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
  const [creating, setCreating] = useState(false);
  const [createdAgent, setCreatedAgent] = useState(null);
  const [createError, setCreateError] = useState('');

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
    // If an agent was already created from this blueprint (e.g. before a
    // refresh), show it as created instead of offering the button again.
    listUserAgents()
      .then((agents) => {
        const existing = agents.find((a) => a.sourceBlueprint === id);
        if (existing) setCreatedAgent(existing);
      })
      .catch(() => {});
  }, [id]);

  async function handleCreateAgent() {
    setCreating(true);
    setCreateError('');
    try {
      const agent = await createAgentFromBlueprint(id);
      setCreatedAgent(agent);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Could not create the agent.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    setError('');
    setSaved('');
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
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

  if (!blueprint) {
    return (
      <div className="nx-page">
        <p className="text-sm text-ink-muted">{error || 'Loading blueprint…'}</p>
      </div>
    );
  }

  return (
    <div className="nx-page space-y-10">
      <header>
        <p className="nx-eyebrow">Blueprint review</p>
        <h1 className="nx-title mt-2">{blueprint.name}</h1>
        <p className="nx-subtitle">{blueprint.purpose}</p>
        <p className="mt-3"><span className="nx-chip">{blueprint.status}</span></p>
        {error && <p className="nx-alert-error mt-4">{error}</p>}
        {saved && <p className="nx-alert-ok mt-4">{saved}</p>}
      </header>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Your agent from this blueprint</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Skip the library — turn this blueprint into your own live agent, with its tools and workflow.
        </p>
        {createError && <p className="nx-alert-error mt-4">{createError}</p>}
        {createdAgent ? (
          <p className="nx-alert-ok mt-4">
            Agent created: <strong>{createdAgent.name}</strong>.{' '}
            <Link className="nx-link font-semibold" to={`/chat/${createdAgent._id}`}>
              Open its chat →
            </Link>
          </p>
        ) : (
          <button type="button" onClick={handleCreateAgent} disabled={creating} className="nx-btn-primary mt-4">
            {creating ? 'Creating…' : 'Create agent from this blueprint'}
          </button>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Workflow</h2>
        <div className="nx-panel mt-3 overflow-hidden">
          <ExecutionGraph workflow={blueprint.workflow} />
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Tools</h2>
          <ul className="mt-3 space-y-2">
            {blueprint.tools.map((t) => (
              <li key={t.name} className="border-b border-line/70 pb-2 text-sm last:border-0">
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="text-ink-muted"> · {t.toolkit}</span>
                <p className="mt-0.5 text-ink-muted">{t.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Triggers</h2>
            <p className="mt-2 text-sm text-ink-muted">{blueprint.triggers.join(' · ')}</p>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Fallback</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{blueprint.fallback}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Matching library agents</h2>
        {matchError && <p className="mt-2 text-sm text-danger">{matchError}</p>}
        {matches.length === 0 && !matchError && (
          <p className="mt-2 text-sm text-ink-muted">No matches yet.</p>
        )}
        <ul className="mt-4 space-y-2">
          {matches.map((m) => (
            <li key={m.agent._id} className="nx-row">
              <div className="min-w-0">
                <Link className="font-semibold text-ink hover:text-signal" to={`/library/${m.agent._id}`}>
                  {m.agent.name}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  tools {m.match.breakdown.tools} · keywords {m.match.breakdown.keywords} · triggers{' '}
                  {m.match.breakdown.triggers} · category {m.match.breakdown.category}
                </p>
              </div>
              <span className="font-display text-2xl font-bold text-signal">{m.match.score}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold tracking-tight">Edit blueprint</h2>
        <p className="mt-1 text-sm text-ink-muted">Adjust the JSON, then save to mark it reviewed.</p>
        <div className="nx-panel mt-3 overflow-hidden">
          <Editor
            height="380px"
            defaultLanguage="json"
            theme="vs-light"
            value={json}
            onChange={(v) => setJson(v || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <button type="button" onClick={handleSave} className="nx-btn-primary mt-4">
          Save changes
        </button>
      </section>
    </div>
  );
}
