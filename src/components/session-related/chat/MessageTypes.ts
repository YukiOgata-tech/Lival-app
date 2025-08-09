// src/components/session-related/chat/MessageTypes.ts
export type ChatMessageType = 'user' | 'log' | 'ai';

export type ChatMessage = {
  id: string;
  userId?: string | null; // ai/logはnullでもOK
  text: string;
  createdAt: any; // Firestore Timestamp | null
  type: ChatMessageType;
};
