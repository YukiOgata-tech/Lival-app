// AIツールコマンドの定義と実行ロジック
import { AIChatGemini, AIChatRoomTag } from '@/lib/GroupSession-related/AIChatGemini';

function toAIChatRoomTag(tag: string | null | undefined): AIChatRoomTag {
  if (tag === 'study' || tag === 'work') {
    return tag;
  }
  return 'general';
}

export type AiToolResult = { ok: true; text: string } | { ok: false; text: string };
export type AiHistoryItem = { role: 'user' | 'ai'; text: string };

export function parseAiCommand(input: string): { cmd: string | null; arg: string } {
  const m = input.trim().match(/^\/(\w+)\s*(.*)$/);
  if (!m) return { cmd: null, arg: input.trim() };
  return { cmd: m[1].toLowerCase(), arg: m[2] ?? '' };
}

export async function runAiTool(
  cmd: string,
  arg: string,
  tag: string | undefined | null
): Promise<AiToolResult> {
  const mapping: Record<string, string> = {
    outline: `以下のテーマの学習/作業アウトラインを、簡潔な箇条書き(5〜8項目程度)で作成してください。\n\nテーマ: ${arg}`,
    fix:     `次の文章を、簡潔・明瞭・丁寧な調子で改善してください。必要に応じて箇条書きや短文にして構いません。\n\n文章: ${arg}`,
    explain: `次の内容を、初学者にも分かるように短くかみ砕いて解説してください。重要語は**強調**してください。\n\n対象: ${arg}`,
  };
  const sys = mapping[cmd];
  if (!sys) {
    return { ok: false, text: '利用可能コマンド: /outline, /fix, /explain' };
  }
  const reply = await AIChatGemini(sys, [], toAIChatRoomTag(tag));
  return { ok: true, text: reply };
}

export async function runAiNormalChat(
  input: string,
  history: AiHistoryItem[],
  tag: string | undefined | null
): Promise<string> {
  return AIChatGemini(input, history, toAIChatRoomTag(tag));
}
