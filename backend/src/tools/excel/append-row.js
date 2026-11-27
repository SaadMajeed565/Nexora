// Excel — Append row. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { clientId, clientSecret, refreshToken } (Microsoft Graph OAuth — one Microsoft app registration covers Teams, Outlook and Excel.)
const { z } = require('zod');

async function getAccessToken(credentials) {
  const { clientId, clientSecret, refreshToken } = credentials || {};
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('excel: Microsoft credentials are required (clientId, clientSecret, refreshToken)');
  }
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `excel: could not get a Microsoft access token (${res.status}): ${data.error_description || data.error || 'unknown error'}`
    );
  }
  return data.access_token;
}

module.exports = {
  toolkit: 'excel',
  name: 'Append row',
  description: 'Appends a row at the end of a worksheet in an Excel workbook stored in OneDrive.',
  input: z.object({
    itemId: z.string().min(1, 'A workbook item id is required'),
    worksheet: z.string().min(1, 'A worksheet name is required').optional().default('Sheet1'),
    values: z.array(z.union([z.string(), z.number()])).min(1, 'At least one cell value is required'),
  }),
  run: async (credentials, input) => {
    const token = await getAccessToken(credentials);
    const usedRangeRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${input.itemId}/workbook/worksheets/${encodeURIComponent(input.worksheet)}/usedRange`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usedRangeData = await usedRangeRes.json().catch(() => ({}));
    if (!usedRangeRes.ok) {
      throw new Error(`excel: read rows failed (${usedRangeRes.status}): ${(usedRangeData.error && usedRangeData.error.message) || 'unknown error'}`);
    }
    const rowCount = (usedRangeData.values || []).length;
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${input.itemId}/workbook/worksheets/${encodeURIComponent(input.worksheet)}/range(address='A${rowCount + 1}')`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [input.values] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`excel: append row failed (${res.status}): ${(data.error && data.error.message) || 'unknown error'}`);
    }
    return { range: `A${rowCount + 1}`, rowIndex: rowCount + 1 };
  },
};
