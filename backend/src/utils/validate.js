const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name is required').max(60),
  description: z.string().max(200).optional(),
});

const createBlueprintSchema = z.object({
  prompt: z.string().min(10, 'Describe the agent in at least 10 characters'),
  workspaceId: z.string().min(1, 'Workspace is required'),
});

const adoptSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace is required'),
  mode: z.enum(['use', 'customize']),
  overrides: z
    .object({
      name: z.string().min(2).optional(),
      description: z.string().min(1).optional(),
      fallback: z.string().min(1).optional(),
      tools: z.array(z.any()).optional(),
      workflow: z.array(z.any()).optional(),
      triggers: z.array(z.string()).optional(),
      capabilities: z.array(z.string()).optional(),
      useCases: z.array(z.string()).optional(),
    })
    .optional(),
});

const sendMessageSchema = z.object({
  // nullish, not just optional: the Chat page holds conversationId in
  // React state as null and sends it explicitly for a new conversation.
  // z.string().optional() rejects an explicit null ("Expected string,
  // received null"), which hard-failed every new chat from the real UI.
  conversationId: z.string().nullish(),
  workspaceId: z.string().nullish(),
  message: z.string().min(1, 'Message is required').max(2000),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { registerSchema, loginSchema, workspaceSchema, createBlueprintSchema, adoptSchema, sendMessageSchema, validate };
