const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const { getMemberWorkspace } = require('../utils/workspace');
const {
  streamChatReply,
  embedText,
  retrieveRelevantMessages,
  buildMemoryBlock,
  RECENT_WINDOW,
} = require('../services/chat.service');
const { describeTool } = require('../agent/chatTools');

// UC-16: send a message and stream the agent's reply back as SSE.
// The user message is saved first; the assistant reply is saved once the
// stream finishes, so the conversation is complete even if the client drops.
async function sendMessage(req, res, next) {
  try {
    const { conversationId, workspaceId, message } = req.body;
    const agent = await Agent.findById(req.params.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
      if (conversation.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your conversation' });
      }
      if (conversation.agent.toString() !== agent._id.toString()) {
        return res.status(400).json({ error: 'Conversation belongs to another agent' });
      }
    } else {
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required for a new conversation' });
      }
      const { workspace, error } = await getMemberWorkspace(workspaceId, req.user._id);
      if (error) return res.status(error.status).json({ error: error.message });
      conversation = await Conversation.create({
        agent: agent._id,
        owner: req.user._id,
        workspace: workspace._id,
        title: message.slice(0, 60),
        messages: [],
      });
    }

    // Long-term memory: embed the new message and store the vector with
    // it, so it can be retrieved in later turns. Best-effort — a failed
    // embedding (quota, network) never blocks the chat.
    const userEmbedding = await embedText(message);
    conversation.messages.push({
      role: 'user',
      content: message,
      ...(userEmbedding ? { embedding: userEmbedding } : {}),
    });
    await conversation.save();

    // Layered session memory (FR-7.3): the last RECENT_WINDOW messages go
    // back to the model verbatim, plus the most similar earlier messages
    // from THIS conversation, retrieved by embedding cosine similarity
    // and appended to the system prompt as a labelled block. If retrieval
    // fails for any reason, the chat falls back to the recent window.
    const history = conversation.messages
      .slice(-RECENT_WINDOW)
      .map((m) => ({ role: m.role, content: m.content }));
    let memoryBlock = '';
    try {
      memoryBlock = buildMemoryBlock(
        retrieveRelevantMessages(conversation.messages, userEmbedding)
      );
    } catch (err) {
      memoryBlock = '';
    }

    let reply = '';
    const toolsUsed = [];
    try {
      const result = await streamChatReply(agent, history, memoryBlock);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      // AI SDK v7: read fullStream and take the text from text-delta parts
      // (the field is `text`, not `textDelta`; textStream alone yields nothing).
      // Tool parts become { tool } events so the UI can show the agent's
      // real tool use as it happens, instead of the reply only narrating it.
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta' && part.text) {
          reply += part.text;
          res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
        } else if (part.type === 'tool-call') {
          const info = describeTool(part.toolName);
          toolsUsed.push(info.name);
          res.write(
            `data: ${JSON.stringify({ tool: { id: part.toolName, name: info.name, toolkit: info.toolkit, status: 'running' } })}\n\n`
          );
        } else if (part.type === 'tool-result' || part.type === 'tool-error') {
          const info = describeTool(part.toolName);
          const failed =
            part.type === 'tool-error' || !!(part.output && part.output.error);
          res.write(
            `data: ${JSON.stringify({ tool: { id: part.toolName, name: info.name, toolkit: info.toolkit, status: failed ? 'failed' : 'done' } })}\n\n`
          );
        }
      }
    } catch (err) {
      if (!res.headersSent) {
        return res.status(err.status || 503).json({ error: err.message || 'AI service is unavailable. Please try again.' });
      }
      res.write(`data: ${JSON.stringify({ error: 'AI service is unavailable.' })}\n\n`);
      res.end();
      return;
    }

    if (!reply.trim()) {
      // A turn that only ran tools still did the work — say what was used
      // instead of claiming the reply failed.
      reply = toolsUsed.length
        ? `Done. I used: ${[...new Set(toolsUsed)].join(', ')}.`
        : "I couldn't generate a reply. Please try again.";
      res.write(`data: ${JSON.stringify({ text: reply })}\n\n`);
    }
    // The reply is embedded too, so future turns can retrieve it.
    const replyEmbedding = await embedText(reply);
    conversation.messages.push({
      role: 'assistant',
      content: reply,
      ...(replyEmbedding ? { embedding: replyEmbedding } : {}),
    });
    try {
      await conversation.save();
    } catch (err) {
      console.error('Failed to save assistant reply:', err.message);
    }
    res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation._id.toString() })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
}

// FR-7.2: conversation history, saved in MongoDB.
async function listConversations(req, res, next) {
  try {
    const { agentId } = req.query;
    const filter = { owner: req.user._id };
    if (agentId) filter.agent = agentId;
    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .select('_id agent title updatedAt createdAt');
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (conversation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your conversation' });
    }
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (conversation.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your conversation' });
    }
    await conversation.deleteOne();
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, listConversations, getConversation, deleteConversation };
