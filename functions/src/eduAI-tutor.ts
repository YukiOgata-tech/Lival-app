// functions/src/eduAI-tutor.ts
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MODEL = "gpt-4.1-mini"; // もしくは 'gpt-4o-mini' (test段階よ)
const MAX_CONTEXT = 8;

type Msg = { role: "user"|"assistant"; content: string };
type Req = {
  messages: Msg[];
  images?: string[];
  previewOnly?: boolean; // true: OCRテキスト化のみ
};

// 直近だけを連結（テキスト履歴）
function historyToText(messages: Msg[]) {
  const last = (Array.isArray(messages) ? messages : []).slice(-MAX_CONTEXT);
  return last.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content ?? ""}`).join("\n\n");
}

// Responses API から安全に本文を吸い出す（空なら ''）
function extractOutputText(resp: any): string {
  const t1 = (resp as any)?.output_text;
  if (t1 && String(t1).trim()) return String(t1).trim();

  const content = resp?.output?.[0]?.content;
  if (Array.isArray(content)) {
    const parts = content
      .map((c: any) => {
        // 新仕様（output_text）
        if (c?.type === "output_text" && c?.text?.value) return c.text.value;
        // 念のため旧互換
        if (c?.type === "text" && c?.text) return c.text;
        return "";
      })
      .filter(Boolean);
    const joined = parts.join("\n").trim();
    if (joined) return joined;
  }
  return "";
}

export const eduAITutorChat = onCall(
  {region: "asia-northeast1", secrets: [OPENAI_API_KEY]},
  async (req) => {
    const {messages, images, previewOnly} = (req.data || {}) as Req;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages is required");
    }

    const hist = historyToText(messages);

    const instructions = previewOnly ?
      [
        "あなたはOCRアシスタントです。",
        "与えられた画像とテキストから「問題本文だけ」を正確に抽出して返します。",
        "数式は必ず TeX で表記し、改行・箇条書きで読みやすく整理してください。",
        "解説は不要です。本文抽出のみを出力してください。",
      ].join("\n"):
      [
        "あなたは日本語の数学チューターAIです。",
        "ユーザーの質問や画像を読み取り、数式は TeX で表記します。",
        "出力ルール：",
        "・インライン数式は \\( ... \\ )、式として見せたい箇所は $$ ... $$（KaTeX互換）。",
        "・複数行は $$\\begin{aligned} ... \\end{aligned}$$ を使用（align* でも可）。",
        "・数式はバッククォートで囲まない、コードブロックにしない。",
        "・文章と数式の間は空行1つで読みやすく。",
        "出力構成：",
        "【要点】2〜3行 / 【解法】段階的に / 【確認】同種のミニ問題1題",
        "式中の記号が混ざらないよう注意し、可読性を最優先に。",
      ].join("\n");


    // 画像パーツ（Responses API 仕様）
    const imageParts =
      (images ?? []).slice(0, 4).map((u) => ({type: "input_image", image_url: u})) as any[];

    // ★ テキストは 'input_text' が正
    const input: any[] = [
      {role: "system", content: [{type: "input_text", text: instructions}]},
      {role: "user", content: [{type: "input_text", text: hist}, ...imageParts]},
    ];

    try {
      const openai = new OpenAI({apiKey: OPENAI_API_KEY.value()});
      const resp = await openai.responses.create({
        model: MODEL,
        input,
        temperature: previewOnly ? 0.1 : 0.2,
        max_output_tokens: 900,
      });

      const text = extractOutputText(resp).trim();
      const fallback = previewOnly ?
        "（抽出テキストを生成できませんでした。画像の解像度や明るさを確認して再度お試しください）" :
        "（回答の生成に失敗しました。もう一度、問題文や前提を少し具体的にしてお試しください）";

      return {text: text || fallback};
    } catch (e: any) {
      console.error("[eduAITutorChat] error:", e?.status, e?.message);
      throw new HttpsError("internal", e?.message || "upstream error");
    }
  }
);
