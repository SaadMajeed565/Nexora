// Telegram — Read messages. Self-contained: only requires
// node-telegram-bot-api + zod. Copyable verbatim into a generated agent
// project — no Nexora backend imports, no sibling tool files. Credentials
// are passed in by the caller (from the secrets store); this file never
// reads process.env and never hardcodes a key.
//
// Expected credentials: { botToken } (a bot token from BotFather — free).
//
// Note: this uses polling (getUpdates). Do NOT set a webhook on this bot —
// a webhook makes getUpdates fail with a 409 conflict. A webhook-based
// Telegram receiver is a Phase 2 runtime consideration, not an LLM tool.
const TelegramBot = require('node-telegram-bot-api');
const { z } = require('zod');

function getBot(credentials) {
  const { botToken } = credentials || {};
  if (!botToken) {
    throw new Error('telegram: credentials are required (botToken)');
  }
  return new TelegramBot(botToken, { polling: false });
}

module.exports = {
  toolkit: 'telegram',
  name: 'Read messages',
  description: 'Reads recent incoming messages the bot has received.',
  input: z.object({
    offset: z.number().int().optional(),
    limit: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const bot = getBot(credentials);
    const updates = await bot.getUpdates({
      offset: input.offset,
      limit: input.limit,
      timeout: 0,
    });
    return {
      messages: (updates || [])
        .filter((u) => u.message && u.message.text)
        .map((u) => ({
          updateId: u.update_id,
          chatId: u.message.chat.id,
          from: u.message.from && u.message.from.username,
          text: u.message.text,
          date: u.message.date,
        })),
    };
  },
};
