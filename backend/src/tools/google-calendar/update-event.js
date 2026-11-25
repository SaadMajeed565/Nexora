// Google Calendar — Update or cancel event. Self-contained: only requires
// googleapis + zod. Copyable verbatim into a generated agent project — no
// Nexora backend imports, no sibling tool files. Credentials are passed in
// by the caller (from the secrets store); this file never reads process.env
// and never hardcodes a key.
//
// Expected credentials: { clientId, clientSecret, refreshToken, accessToken? }
// (Google OAuth2 — refreshToken is preferred; accessToken alone also works
// until it expires.)
const { google } = require('googleapis');
const { z } = require('zod');

function getAuth(credentials) {
  const { clientId, clientSecret, refreshToken, accessToken } = credentials || {};
  if (!clientId || !clientSecret || (!refreshToken && !accessToken)) {
    throw new Error(
      'google-calendar: Google OAuth credentials are required (clientId, clientSecret, and refreshToken or accessToken)'
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
}

// Times are ISO 8601 strings (e.g. "2026-11-26T10:00:00+05:00").
const isoDateTime = z
  .string()
  .min(1, 'An ISO date-time is required')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Must be a valid ISO date-time');

module.exports = {
  toolkit: 'google-calendar',
  name: 'Update or cancel event',
  description: 'Reschedules an event (update) or cancels it (cancel).',
  input: z.object({
    eventId: z.string().min(1, 'An event id is required'),
    action: z.enum(['update', 'cancel']),
    summary: z.string().optional(),
    start: isoDateTime.optional(),
    end: isoDateTime.optional(),
    description: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const calendar = google.calendar({ version: 'v3', auth: getAuth(credentials) });
    if (input.action === 'cancel') {
      await calendar.events.delete({ calendarId: 'primary', eventId: input.eventId });
      return { id: input.eventId, cancelled: true };
    }
    const patch = {};
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.description !== undefined) patch.description = input.description;
    if (input.start !== undefined) patch.start = { dateTime: input.start };
    if (input.end !== undefined) patch.end = { dateTime: input.end };
    const { data } = await calendar.events.patch({
      calendarId: 'primary',
      eventId: input.eventId,
      requestBody: patch,
    });
    return { id: data.id, summary: data.summary, htmlLink: data.htmlLink };
  },
};
