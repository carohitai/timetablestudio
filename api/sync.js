// Vercel serverless function — cloud sync endpoint
// GET  /api/sync  -> { data, updatedAt, updatedBy }
// PUT  /api/sync  -> stores { data }, returns { ok, updatedAt }
// Auth: `Authorization: Bearer <SYNC_PASSCODE>` where SYNC_PASSCODE is a Vercel env var.

import { kv } from '@vercel/kv';

const KEY = 'tws:timetable:v1';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — KV soft cap for single value

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const passcode = process.env.SYNC_PASSCODE;
  if (!passcode) {
    return res.status(500).json({ error: 'Server not configured: SYNC_PASSCODE env var is missing.' });
  }

  const auth = req.headers.authorization || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (provided !== passcode) {
    return res.status(401).json({ error: 'Invalid passcode.' });
  }

  try {
    if (req.method === 'GET') {
      const doc = await kv.get(KEY);
      if (!doc) return res.status(200).json({ data: null, updatedAt: null, updatedBy: null });
      return res.status(200).json(doc);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || !body.data) {
        return res.status(400).json({ error: 'Request body must be { data, updatedBy? }.' });
      }
      const serialized = JSON.stringify(body.data);
      if (serialized.length > MAX_BYTES) {
        return res.status(413).json({ error: `Payload too large (${serialized.length} bytes, max ${MAX_BYTES}).` });
      }
      const doc = {
        data: body.data,
        updatedAt: Date.now(),
        updatedBy: typeof body.updatedBy === 'string' ? body.updatedBy.slice(0, 64) : 'anonymous'
      };
      await kv.set(KEY, doc);
      return res.status(200).json({ ok: true, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + (err && err.message ? err.message : String(err)) });
  }
}
