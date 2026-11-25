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
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">Prompt Studio</h1>
      <p className="mt-1 text-sm text-gray-500">
        Describe the agent you want in plain words. Nexora turns it into a blueprint you can review.
      </p>
      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleGenerate} className="mt-4 space-y-3">
        <label className="block text-sm font-medium">Workspace</label>
        <select className="w-full rounded border px-3 py-2" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
          {workspaces.map((w) => (
            <option key={w._id} value={w._id}>{w.name}</option>
          ))}
        </select>
        <label className="block text-sm font-medium">What should the agent do?</label>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={6}
          placeholder="Example: Answer customer emails, check the order in our sheet, and reply politely within one hour."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
        <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" type="submit" disabled={generating}>
          {generating ? 'Generating blueprint…' : 'Generate blueprint'}
        </button>
      </form>
    </div>
  );
}
