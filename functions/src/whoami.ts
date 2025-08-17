import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

export const whoami = onRequest(
  { region: 'asia-northeast1', cors: true },
  async (req, res) => {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer (.+)$/);
    if (!m) { res.status(401).json({ error: 'missing bearer' }); return; }
    try {
      const decoded = await admin.auth().verifyIdToken(m[1], true);
      res.json({ ok: true, uid: decoded.uid, project: decoded.aud });
    } catch (e: any) {
      res.status(401).json({ error: 'verifyIdToken failed', message: e?.message });
    }
  }
);
