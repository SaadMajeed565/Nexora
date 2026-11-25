import api from './api';

export async function listLibraryAgents({ search, category } = {}) {
  const { data } = await api.get('/library', {
    params: { ...(search ? { search } : {}), ...(category ? { category } : {}) },
  });
  return data.agents;
}

export async function getLibraryAgent(id) {
  const { data } = await api.get(`/library/${id}`);
  return data.agent;
}

export async function matchAgents(blueprintId) {
  const { data } = await api.get('/library/match', { params: { blueprintId } });
  return data.matches;
}

export async function adoptAgent(id, payload) {
  const { data } = await api.post(`/library/${id}/adopt`, payload);
  return data.agent;
}

export async function listUserAgents(workspaceId) {
  const { data } = await api.get('/agents', { params: workspaceId ? { workspaceId } : {} });
  return data.agents;
}

export async function getUserAgent(id) {
  const { data } = await api.get(`/agents/${id}`);
  return data.agent;
}
