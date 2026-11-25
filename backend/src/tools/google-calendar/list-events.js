// Google Calendar — List events. Self-contained: only requires googleapis
// + zod. Copyable verbatim into a generated agent project — no Nexora
// backend imports, no sibling tool files. Credentials are passed in by the
// caller (from the secrets store); this file never reads process.env and
// never hardcodes a key.
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

module.exports = {
  toolkit: 'google-calendar',
  name: 'List events',
  description: 'Lists events in a time range (use it to check free slots).',
  input: z.object({
    timeMin: z
      .string()
      .min(1, 'A start time is required')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Must be a valid ISO date-time'),
    timeMax: z
      .string()
      .min(1, 'An end time is required')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Must be a valid ISO date-time'),
    maxResults: z.number().int().min(1).max(250).optional().default(20),
  }),
  run: async (credentials, input) => {
    const calendar = google.calendar({ version: 'v3', auth: getAuth(credentials) });
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      maxResults: input.maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return {
      events: (data.items || []).map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start && (e.start.dateTime || e.start.date),
        end: e.end && (e.end.dateTime || e.end.date),
      })),
    };
  },
};
