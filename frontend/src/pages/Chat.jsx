import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLibraryAgent, getUserAgent } from '../services/library.service';
import { fetchWorkspaces } from '../services/auth.service';
import { streamChat, listConversations, getConversation, deleteConversation } from '../services/chat.service';

export default function Chat() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    getUserAgent(agentId)
      .then(setAgent)
      .catch(() =>
        getLibraryAgent(agentId).then(setAgent).catch(() => setError('Could not load the agent.'))
      );
    listConversations(agentId).then(setConversations).catch(() => {});
    fetchWorkspaces()
      .then((list) => {
        if (list.length > 0) setWorkspaceId(list[0]._id);
      })
      .catch(() => {});
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function openConversation(id) {
    getConversation(id)
      .then((c) => {
        setConversationId(c._id);
        setMessages(c.messages);
      })
      .catch(() => setError('Could not load the conversation.'));
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
  }

  async function handleDelete(id) {
    try {
      await deleteConversation(id);
      setConversations(conversations.filter((c) => c._id !== id));
      if (id === conversationId) newChat();
    } catch (err) {
      setError('Could not delete the conversation.');
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    try {
      const result = await streamChat(
        agentId,
        { conversationId, workspaceId: agent?.workspace || workspaceId, message: text },
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + chunk };
            return next;
          });
        }
      );
      setConversationId(result.conversationId);
      listConversations(agentId).then(setConversations).catch(() => {});
    } catch (err) {
      setError(err.message || 'Could not send the message.');
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'assistant' && next[next.length - 1].content === '') {
          next.pop();
        }
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  if (!agent) return <div className="p-6">{error || 'Loading…'}</div>;

  return (
    <div className="mx-auto flex max-w-5xl gap-4 p-6">
      <aside className="w-56 shrink-0">
        <button onClick={newChat} className="w-full rounded bg-black px-3 py-2 text-sm text-white">+ New chat</button>
        <ul className="mt-3 space-y-1">
          {conversations.map((c) => (
            <li key={c._id} className="flex items-center justify-between rounded border bg-white px-2 py-1 text-sm">
              <button onClick={() => openConversation(c._id)} className="flex-1 truncate text-left">{c.title}</button>
              <button onClick={() => handleDelete(c._id)} className="ml-2 text-red-600">×</button>
            </li>
          ))}
        </ul>
        <Link className="mt-4 block text-sm text-blue-600" to="/library">← Back to Library</Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-xl font-bold">Chat with {agent.name}</h1>
        <p className="text-sm text-gray-500">{agent.description}</p>
        {error && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded border bg-white p-4" style={{ minHeight: 320 }}>
          {messages.length === 0 && <p className="text-sm text-gray-500">Say hello — the agent answers in character.</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <span className={`inline-block max-w-[80%] rounded px-3 py-2 text-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-gray-100'}`}>
                {m.content}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" type="submit" disabled={sending}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
