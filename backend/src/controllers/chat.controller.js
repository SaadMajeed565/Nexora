const Agent = require('../models/Agent');
const Conversation = require('../models/Conversation');
const { getMemberWorkspace } = require('../utils/workspace');
const { streamChatReply } = require('../services/chat.service');

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

    conversation.messages.push({ role: 'user', content: message });
    await conversation.save();

    // Session memory (FR-7.3): the last 20 messages go back to the model.
    const history = conversation.messages
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    let reply = '';
    try {
      const result = await streamChatReply(agent, history);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      // AI SDK v7: read fullStream and take the text from text-delta parts
      // (the field is `text`, not `textDelta`; textStream alone yields nothing).
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta' && part.text) {
          reply += part.text;
          res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
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
      reply = "I couldn't generate a reply. Please try again.";
      res.write(`data: ${JSON.stringify({ text: reply })}\n\n`);
    }
    conversation.messages.push({ role: 'assistant', content: reply });
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
