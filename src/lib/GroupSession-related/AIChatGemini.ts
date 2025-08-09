// src/lib/GroupSession-related/AIChatGemini.ts
import { aitoolsGemini } from "@/lib/firebase";

/** グループセッション用AIチャットのタグ */
export type AIChatRoomTag = "general" | "study" | "work";

/** AIチャット用のGemini呼び出しラッパー */
export async function AIChatGemini(
  question: string,
  history: { role: "user" | "ai"; text: string }[] = [],
  roomTag: AIChatRoomTag = "general"
): Promise<string> {
  // タグでプロンプトを切り替え
  let systemPrompt = "あなたは親切でプロフェッショナルなAIチャットボット。日本語で明瞭、端的に答えてください。";
  if (roomTag === "study") {
    systemPrompt += " 質問が学習や勉強に関する場合は、わかりやすく噛み砕いて説明してください。";
  } else if (roomTag === "work") {
    systemPrompt += " 仕事やビジネスの質問には、実用的で論理的なアドバイスを心がけてください。";
  }

  // 質問履歴と組み合わせてプロンプト構築（ヒストリー5件まで）
  const context = history
    .slice(-8) // 最新の8件を使用(テスト段階)
    .map((h) => `[${h.role === "user" ? "ユーザー" : "AI"}] ${h.text}`)
    .join("\n");
  const prompt = `
${systemPrompt}

これまでのやり取り:
${context}

ユーザーからの質問:
${question}

AIとして適切に返答してください。返答は必ず日本語で簡潔かつ分かりやすく！
  `.trim();

  const result = await aitoolsGemini.generateContent([prompt]);
  return (
    result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "AIの返答取得に失敗しました。"
  );
}
