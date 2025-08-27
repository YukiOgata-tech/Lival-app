import {onCall} from "firebase-functions/v2/https";

export const ping = onCall({region: "asia-northeast1"}, (req) => {
  // ここに来れば App Check/権限の前段は通っています
  console.log("[ping] auth?", !!req.auth?.uid, "appCheck?", !!(req as any).app?.appId);
  return {
    ok: true,
    uid: req.auth?.uid ?? null,
    appId: (req as any).app?.appId ?? null,
  };
});
