import api from './api';

export async function generateBlueprint(prompt, workspaceId) {
  const { data } = await api.post('/blueprints', { prompt, workspaceId });
  return data.blueprint;
}

export async function listBlueprints(workspaceId) {
  const { data } = await api.get('/blueprints', { params: workspaceId ? { workspaceId } : {} });
  return data.blueprints;
}

export async function getBlueprint(id) {
  const { data } = await api.get(`/blueprints/${id}`);
  return data.blueprint;
}

export async function updateBlueprint(id, blueprint) {
  const { data } = await api.put(`/blueprints/${id}`, blueprint);
  return data.blueprint;
}

export async function deleteBlueprint(id) {
  await api.delete(`/blueprints/${id}`);
}
