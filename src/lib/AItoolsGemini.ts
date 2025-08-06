// src/lib/AItoolsGemini.ts

import { aitoolsGemini } from "@/lib/firebase";

/** 翻訳種別（フォーマル/カジュアル） */
export type AItoolsTranslateTone = "formal" | "casual";

/** サポート言語 */
export type AItoolsTranslateLang = "en" | "ko" | "zh" | "ja";

/** Gemini APIで翻訳を実行 */
export async function AItoolsGeminiTranslate(
  text: string,
  to: AItoolsTranslateLang = "en",
  tone: AItoolsTranslateTone = "formal"
): Promise<string> {
  const tonePrompt =
    tone === "casual"
      ? "in a very casual, slang style"
      : tone === "formal"
      ? "in a formal and polite manner"
      : "";

  const langPrompt: Record<AItoolsTranslateLang, string> = {
    en: "English",
    ko: "Korean",
    zh: "Chinese",
    ja: "Japanese",
  };


  const prompt = `
Please detect the language of the following text and translate it into ${langPrompt[to]}${tonePrompt ? ` (${tonePrompt})` : ""}.
ONLY return the translated result without any extra explanation, and don't return the detected language.

${text}
`;

  const result = await aitoolsGemini.generateContent([prompt]);
  return (
    result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
    ""
  );
}
