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
    } catch {
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

  if (!agent) {
    return (
      <div className="nx-page">
        <p className="text-sm text-ink-muted">{error || 'Loading chat…'}</p>
      </div>
    );
  }

  return (
    <div className="nx-page flex h-[calc(100dvh-150px)] flex-col !max-w-6xl">
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="w-full shrink-0 lg:h-full lg:w-56 lg:overflow-y-auto">
          <button type="button" onClick={newChat} className="nx-btn-primary w-full">
            New chat
          </button>
          <ul className="mt-4 space-y-1">
            {conversations.map((c) => (
              <li
                key={c._id}
                className={`flex items-center gap-2 border px-2.5 py-2 text-sm transition ${
                  c._id === conversationId
                    ? 'border-signal/40 bg-signal-mist/50'
                    : 'border-transparent hover:border-line hover:bg-surface-raised'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openConversation(c._id)}
                  className="min-w-0 flex-1 truncate text-left font-medium text-ink"
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c._id)}
                  className="text-ink-muted transition hover:text-danger"
                  aria-label="Delete conversation"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <Link className="nx-link mt-6 inline-block text-sm" to="/library">
            ← Library
          </Link>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header>
            <p className="nx-eyebrow">Live session</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{agent.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">{agent.description}</p>
          </header>

          {error && <p className="nx-alert-error mt-4">{error}</p>}

          <div className="nx-panel mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {messages.length === 0 && (
                <p className="py-12 text-center text-sm text-ink-muted">
                  Start the conversation — the agent replies in character.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-ink text-surface-raised'
                        : 'border border-line bg-surface-sunken/40 text-ink'
                    }`}
                  >
                    {m.content || (sending && i === messages.length - 1 ? '…' : '')}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
              <input
                className="nx-input flex-1 !border-0 !bg-transparent !ring-0 focus:!ring-0"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button className="nx-btn-primary shrink-0" type="submit" disabled={sending}>
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
