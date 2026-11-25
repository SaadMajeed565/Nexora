import api from './api';

export async function register(name, email, password) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function fetchWorkspaces() {
  const { data } = await api.get('/workspaces');
  return data.workspaces;
}

export async function createWorkspace(name, description) {
  const { data } = await api.post('/workspaces', { name, description });
  return data.workspace;
}
