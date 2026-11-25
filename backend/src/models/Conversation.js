const mongoose = require('mongoose');

const messageSubSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A chat session with one agent. Messages are the session memory (FR-7.3):
// the last 20 are sent back to the model with each new message.
const conversationSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, default: 'New chat' },
    messages: [messageSubSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
