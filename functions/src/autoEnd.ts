import * as admin from "firebase-admin";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {CloudTasksClient} from "@google-cloud/tasks";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** ====== 環境変数 ====== */
const REGION = process.env.TASKS_LOCATION || "asia-northeast1";
const QUEUE_NAME = process.env.TASK_QUEUE_NAME || "room-auto-end-queue";
const TASKS_LOCATION = process.env.TASKS_LOCATION || "asia-northeast1";
const TASK_HANDLER_URL = process.env.TASK_HANDLER_URL || "";
const TASK_SECRET = process.env.TASK_SECRET;

const tasksClient = new CloudTasksClient();

function plannedMinutes(room: any): number {
  return Number(room?.minutes ?? room?.plannedMinutes ?? 0) || 0;
}

/** ❶ セッション開始を検知 → Cloud Tasks を1回だけ予約 */
export const scheduleRoomAutoEnd = onDocumentUpdated(
  {document: "rooms/{roomId}", region: REGION},
  async (event) => {
    const before = event.data?.before?.data() as any;
    const after = event.data?.after?.data() as any;
    const roomId = event.params.roomId as string;

    const justStarted = !!after?.sessionStartAt && !before?.sessionStartAt;
    if (!justStarted) return;
    if (after?.sessionForceEndedAt || after?.status === "ended") return;
    if (after?.sessionAutoTaskId) return;

    const startMs = after.sessionStartAt.toMillis?.() as number;
    const minutes = plannedMinutes(after);
    if (!startMs || !minutes) return;

    const scheduleSeconds = Math.floor((startMs + minutes * 60_000) / 1000);

    const parent = tasksClient.queuePath(
      process.env.GCLOUD_PROJECT!,
      TASKS_LOCATION,
      QUEUE_NAME
    );

    const payload = Buffer.from(
      JSON.stringify({roomId, token: TASK_SECRET})
    ).toString("base64");

    const [task] = await tasksClient.createTask({
      parent,
      task: {
        httpRequest: {
          url: TASK_HANDLER_URL,
          httpMethod: "POST",
          headers: {"Content-Type": "application/json"},
          body: payload,
        },
        scheduleTime: {seconds: scheduleSeconds},
      },
    });

    await db.doc(`rooms/${roomId}`).set(
      {
        sessionAutoTaskId: task.name,
        plannedEndAt: admin.firestore.Timestamp.fromMillis(scheduleSeconds * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
  }
);

/** ❷ タスク着弾：未終了なら status:'ended' を立てる（⚠️ void を返す） */
export const endRoomByTask = onRequest({region: REGION}, async (req, res) => {
  const {roomId, token} = (req.body || {}) as { roomId?: string; token?: string };

  if (!roomId || token !== TASK_SECRET) {
    res.status(403).send("forbidden");
    (void 0); return;
  }

  try {
    const ref = db.doc(`rooms/${roomId}`);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const r = snap.data() as any;
      if (r?.sessionForceEndedAt || r?.status === "ended") return;
      tx.update(ref, {
        status: "ended",
        sessionAutoEndedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.status(200).send("ok");
    (void 0); return;
  } catch (e) {
    console.error("endRoomByTask error", e);
    res.status(500).send("error");
    (void 0); return;
  }
});
