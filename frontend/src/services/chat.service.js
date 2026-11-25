import api from './api';

// Streams a chat reply over SSE. onChunk receives each text piece;
// resolves with { conversationId } when the stream ends.
export async function streamChat(agentId, { conversationId, workspaceId, message }, onChunk) {
  const token = localStorage.getItem('nexora_token');
  const res = await fetch(`/api/chat/${agentId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, workspaceId, message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not send the message.');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneResult = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const line of parts) {
      if (!line.startsWith('data: ')) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.text) onChunk(payload.text);
      if (payload.error) throw new Error(payload.error);
      if (payload.done) doneResult = payload;
    }
  }
  return doneResult || {};
}

export async function listConversations(agentId) {
  const { data } = await api.get('/chat/conversations', { params: agentId ? { agentId } : {} });
  return data.conversations;
}

export async function getConversation(id) {
  const { data } = await api.get(`/chat/conversations/${id}`);
  return data.conversation;
}

export async function deleteConversation(id) {
  await api.delete(`/chat/conversations/${id}`);
}
