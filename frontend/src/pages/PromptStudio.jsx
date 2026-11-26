import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWorkspaces } from '../services/auth.service';
import { generateBlueprint } from '../services/blueprint.service';

export default function PromptStudio() {
  const [prompt, setPrompt] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces()
      .then((list) => {
        setWorkspaces(list);
        if (list.length > 0) setWorkspaceId(list[0]._id);
      })
      .catch(() => setError('Could not load workspaces.'));
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const blueprint = await generateBlueprint(prompt, workspaceId);
      navigate(`/blueprints/${blueprint._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate the blueprint. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="nx-page max-w-3xl">
      <header>
        <p className="nx-eyebrow">Module 2</p>
        <h1 className="nx-title mt-2">Prompt Studio</h1>
        <p className="nx-subtitle">
          Describe the agent in plain language. Nexora drafts a structured blueprint you can review and refine.
        </p>
      </header>

      {error && <p className="nx-alert-error mt-6">{error}</p>}

      <form onSubmit={handleGenerate} className="nx-panel mt-8 space-y-5 p-6 sm:p-8">
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
        <div>
          <label className="nx-label" htmlFor="prompt">What should the agent do?</label>
          <textarea
            id="prompt"
            className="nx-textarea min-h-[180px]"
            placeholder="Example: Answer customer emails, check the order in our sheet, and reply politely within one hour."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-xs text-ink-muted">Gemini drafts tools, workflow, triggers, and fallback.</p>
          <button className="nx-btn-primary" type="submit" disabled={generating || !workspaceId}>
            {generating ? 'Generating blueprint…' : 'Generate blueprint'}
          </button>
        </div>
      </form>
    </div>
  );
}
