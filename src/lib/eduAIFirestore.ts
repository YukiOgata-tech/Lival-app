// src/services/eduAIFirestore.ts
import { firebaseAuth } from '@/lib/firebase';
import { firestore } from '@/lib/firebase';
import {
  doc, setDoc, serverTimestamp,
  collection, addDoc, updateDoc
} from 'firebase/firestore';

export type EduAITag = 'important'|'memorize'|'check';

export async function eduAIEnsureThread(agent?: string) {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const threadId = crypto.randomUUID();
  const ref = doc(firestore, 'users', uid, 'eduAI_threads', threadId);
  await setDoc(ref, {
    agent: agent ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { uid, threadId };
}

export async function eduAIUpsertThread(threadId: string, agent?: string) {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const ref = doc(firestore, 'users', uid, 'eduAI_threads', threadId);
  await setDoc(ref, { agent: agent ?? null, updatedAt: serverTimestamp() }, { merge: true });
  return { uid, threadId };
}

export async function eduAIAddMessage(
  threadId: string,
  msg: { role:'user'|'assistant'; content:string; agent?:string|null; tags?:EduAITag[] }
) {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const col = collection(firestore, 'users', uid, 'eduAI_threads', threadId, 'messages');
  const ref = await addDoc(col, {
    ...msg,
    tags: msg.tags ?? [],
    createdAt: serverTimestamp(),
  });
  return ref.id; // messageId
}

export async function eduAIUpdateMessageTags(threadId: string, messageId: string, tags: EduAITag[]) {
  const uid = firebaseAuth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const mref = doc(firestore, 'users', uid, 'eduAI_threads', threadId, 'messages', messageId);
  await updateDoc(mref, { tags });
}
