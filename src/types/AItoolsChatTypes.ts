// src/types/AItoolsChatTypes.ts
// AItools（OCR/翻訳チャット専用）の型定義
export type AItoolsChatType = "ocr" | "translation";

export interface AItoolsChatMessage {
  id: string; // uuid等
  type: AItoolsChatType;
  content: string;         // 入力 or 認識/翻訳結果
  role: "user" | "ai";
  timestamp: number;
  // OCRなら画像URIや認識全文なども追記可
  imageUri?: string;       // OCR専用: 元画像のURI
  ocrText?: string;        // OCR専用: 認識された全文
  translatedText?: string; // 翻訳専用: Geminiからの返答
}

export interface AItoolsChatThread {
  id: string; // uuid等
  type: AItoolsChatType;
  title: string; // 履歴リスト表示用タイトル
  messages: AItoolsChatMessage[];
  createdAt: number;
  updatedAt: number;
}
