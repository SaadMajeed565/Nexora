require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { seedPrebuiltAgents } = require('./services/library.service');

const app = express();
app.use(cors());
app.use(express.json());

// Health check (used by the runtime + Docker)
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Module 1 routes (auth + workspaces). Modules 2-8 mount here as they land.
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/workspaces', require('./routes/workspace.routes'));
app.use('/api/blueprints', require('./routes/blueprint.routes'));
app.use('/api/library', require('./routes/library.routes'));
app.use('/api/agents', require('./routes/agent.routes'));
app.use('/api/chat', require('./routes/chat.routes'));

// Error handler — plain-language errors (NFR-US-02).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    try {
      await seedPrebuiltAgents();
    } catch (err) {
      console.error('Failed to seed prebuilt agents:', err.message);
    }
  } else {
    console.log('MONGODB_URI not set — running without a database');
  }
  app.listen(PORT, () => console.log(`Nexora backend on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
