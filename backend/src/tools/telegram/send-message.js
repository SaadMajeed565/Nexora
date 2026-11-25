// Telegram — Send message. Self-contained: only requires
// node-telegram-bot-api + zod. Copyable verbatim into a generated agent
// project — no Nexora backend imports, no sibling tool files. Credentials
// are passed in by the caller (from the secrets store); this file never
// reads process.env and never hardcodes a key.
//
// Expected credentials: { botToken } (a bot token from BotFather — free).
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
  name: 'Send message',
  description: 'Sends a message to a Telegram chat.',
  input: z.object({
    chatId: z.union([z.string(), z.number()]),
    text: z.string().min(1, 'A message is required'),
  }),
  run: async (credentials, input) => {
    const bot = getBot(credentials);
    const sent = await bot.sendMessage(input.chatId, input.text);
    return { messageId: sent.message_id, chatId: sent.chat.id };
  },
};
