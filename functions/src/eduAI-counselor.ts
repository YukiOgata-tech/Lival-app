// functions/src/eduAI-counselor.ts
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MODEL_STANDARD = "gpt-4o-mini";
const MODEL_PREMIUM = "gpt-4.1";

type Msg = { role: "user"|"assistant"; content: string };
type Req = {
  messages: Msg[];
  allowSearch?: boolean;
  quality?: "standard"|"premium";
};

function historyToInput(messages: Msg[]) {
  const last = (Array.isArray(messages) ? messages : []).slice(-8);
  return last.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content ?? ""}`).join("\n\n");
}

function makeWebSearchTools(enabled: boolean) {
  if (!enabled) return undefined;
  return [{type: "web_search"}] as any;
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

export const eduAICounselorChat = onCall(
  {region: "asia-northeast1", secrets: [OPENAI_API_KEY]},
  async (req) => {
    const {messages, allowSearch, quality} = (req.data || {}) as Req;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages is required");
    }

    const flavor = quality === "premium" ? "premium" : "standard";
    const model = flavor === "premium" ? MODEL_PREMIUM : MODEL_STANDARD;
    const search = !!allowSearch;

    const common = [
      "あなたは日本語の「進路カウンセラーAI」です。",
      "最新の制度・募集要項・公式発表を重視し、正確で読みやすい回答を作成します。",
      "出力構造：",
      "【結論】… 2〜3行で要約。",
      "【根拠】… 箇条書き（最大5点）。重要な数値や締切は【】で強調。",
      "【出典】… 次の形式（各行）：",
      "  ・〔サイト名〕（年度/最終更新: YYYY-MM-DD もしくは YYYY／不明は「年不明」）- ドメイン",
      "不確実・地域差がある箇所は「要確認」と明記し、確認先のキーワードも提案。",
    ].join("\n");

    const standardAddendum = [
      "ユーザーの質問が曖昧な場合：",
      "・まず【結論(暫定)】を短く提示。",
      "・続けて【確認したいこと】を最大3点（Yes/Noや選択式を優先）。",
      "・最後に【次の一歩】として、ユーザーがすぐ選べる追質問テンプレを2つ提案。",
      "明確な質問なら逆質問は省略し、【次の一歩】で関連手続き・注意点を1行で提示。",
      !search ? "※検索OFFのため一般的な情報。確定には公式の最新資料の確認を促してください。" : "",
    ].filter(Boolean).join("\n");

    const premiumAddendum = [
      "可能な限り一度のやり取りで解決を目指し、網羅的かつ厳密に回答します。",
      "出典の年度/更新日が見つからない場合は必ず「年不明」と明示。",
      "最後に【次の手続き】として直近の締切・準備物を1〜3行で提示。",
      !search ? "※検索OFFのため出典は既知情報のみ。確定には公式原本の確認を促してください。" : "",
    ].filter(Boolean).join("\n");

    const instructions = [
      common,
      (flavor === "premium" ? premiumAddendum : standardAddendum),
    ].join("\n\n");

    const input = historyToInput(messages);
    const tools = makeWebSearchTools(search);

    try {
      const openai = new OpenAI({apiKey: OPENAI_API_KEY.value()});
      const resp = await openai.responses.create({
        model,
        instructions,
        input,
        ...(tools ? {tools} : {}),
        temperature: flavor === "premium" ? 0.2 : 0.3,
        max_output_tokens: 900,
      });
      const text = extractOutputText(resp).trim();
      const fallback = "（回答の生成に失敗しました。質問をもう少し具体的にして再度お試しください）";
      return {text: text || fallback};
    } catch (e: any) {
      console.error("[eduAICounselorChat] error:", e?.status, e?.message, e);
      throw new HttpsError("internal", e?.message || "upstream error");
    }
  }
);
