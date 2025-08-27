// functions/src/eduAI-planner.ts
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MODEL = "gpt-4o-mini";
const MAX_CONTEXT = 8;

type Msg = { role: "user"|"assistant"; content: string };
type Req = {
  messages: Msg[];
  planMode?: boolean;
  horizon?: "1w"|"2w"|"1m"|"2m"|"1y" | string | undefined;
  priorities?: string[] | undefined;
};

function historyToInput(messages: Msg[]) {
  const last = (Array.isArray(messages) ? messages : []).slice(-MAX_CONTEXT);
  return last.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content ?? ""}`).join("\n\n");
}

function extractOutputText(resp: any): string {
  const t1 = (resp as any)?.output_text;
  if (t1 && String(t1).trim()) return String(t1).trim();
  const content = resp?.output?.[0]?.content;
  if (Array.isArray(content)) {
    const parts = content.map((c: any) => c?.text?.value ?? c?.text ?? "").filter(Boolean);
    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }
  return "";
}

export const eduAIPlannerChat = onCall(
  {region: "asia-northeast1", secrets: [OPENAI_API_KEY]},
  async (req) => {
    const {messages, planMode, horizon, priorities} = (req.data || {}) as Req;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages is required");
    }

    const common = [
      "あなたは「学習計画AI」です。",
      "目標から逆算して必要タスクを分解し、負荷/頻度/定着のバランスを最適化します。",
      "回答は簡潔かつ実行可能性重視で、曖昧さを残さないようにします。",
    ].join("\n");

    const conversational = [
      "ユーザーの入力が曖昧な場合：",
      "・まず【現状理解(暫定)】を2〜3行で提示。",
      "・続けて【確認したいこと】最大2点（Yes/Noや選択肢）で会話を前進させる。",
      "・最後に【次の一歩】として、今すぐ指示できる追質問テンプレを2つ提案。",
      "明確な指示がある場合は要点をまとめた短いアドバイス+1ステップの行動で返す。",
    ].join("\n");

    const planBuilder = [
      "以下の出力構造に従って、当面の計画を具体化してください：",
      "【目標(要約)】SMART準拠の1行要約（指標と期日を含む）",
      "【戦略】達成方針を3点以内で箇条書き",
      "【週間プラン】週あたりの回数/合計時間/配分（例: 週4回×45分=180分）",
      "【日次タスク】具体的作業の箇条書き（所要時間/トリガー/優先度）",
      "【マイルストーン】中間チェックポイントと達成判定の基準（日時/スコア等）",
      "【リスク&対策】起こりやすい失敗と回避策を2点",
      "【次の一歩】これからの最小ステップを1つ",
      "※前提が不足していれば最小限の前提を置き、「前提: ...」として明示する。",
    ].join("\n");

    const horizonNote = (() => {
      switch (horizon) {
      case "1w": return "計画の対象期間は【1週間】を基準にしてください。";
      case "2w": return "計画の対象期間は【2週間】を基準にしてください。";
      case "1m": return "計画の対象期間は【1ヶ月】を基準にしてください。";
      case "2m": return "計画の対象期間は【2ヶ月】を基準にしてください。";
      case "1y": return "計画の対象期間は【1年】を基準にしてください。";
      default: return "";
      }
    })();

    const priorityNote = priorities?.length ?
      `ユーザー重要視ポイント：${priorities.map((p) => `「${p}」`).join("、")}。計画ではこれらを優先度付けに反映してください。` :
      "";

    const instructions = [
      common,
      (planMode ? [planBuilder, horizonNote, priorityNote].filter(Boolean).join("\n") : conversational),
    ].join("\n\n");

    const input = historyToInput(messages);

    try {
      const openai = new OpenAI({apiKey: OPENAI_API_KEY.value()});
      const resp = await openai.responses.create({
        model: MODEL,
        instructions,
        input,
        temperature: planMode ? 0.2 : 0.3,
        max_output_tokens: 900,
      });
      const text = extractOutputText(resp).trim();
      const fallback = planMode ?
        "（計画の生成に失敗しました。目標や期間をもう少し具体的に指定して再度お試しください）" :
        "（回答の生成に失敗しました。もう一度お試しください）";
      return {text: text || fallback};
    } catch (e:any) {
      console.error("[eduAIPlannerChat] error:", e?.status, e?.message, e);
      throw new HttpsError("internal", e?.message || "upstream error");
    }
  }
);
