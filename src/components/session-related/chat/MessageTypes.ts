// src/components/session-related/chat/MessageTypes.ts
export type ChatRole = 'user' | 'log' | 'ai';

export type ChatMessage = {
  id: string;
  userId?: string | null;
  text: string;
  createdAt: any; // Firestore Timestamp | null
  type: ChatRole;
};
