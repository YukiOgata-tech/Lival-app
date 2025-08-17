import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Plus } from 'lucide-react-native';
import { EDU_AI_THEME } from '@/theme/eduAITheme';

export type Agent = 'auto'|'tutor'|'counselor'|'planner';

type Props = {
  manualAgent: Agent;
  assignedAgent: 'tutor'|'counselor'|'planner'|null;
  locked?: boolean;                 // ← 追加：確定後はロック
  onSelect: (a: Agent) => void;
  onNewThread: () => void;          // ← 追加：新しいスレッド開始
};

const Pill = ({
  label, active, onPress, disabled
}: { label:string; active?:boolean; onPress?:()=>void; disabled?:boolean }) => (
  <Pressable
    onPress={!disabled ? onPress : undefined}
    className={`px-4 py-2 mr-2 rounded-full border ${
      active ? 'bg-blue-600 border-blue-600' : 'bg-white border-neutral-300'
    } ${disabled ? 'opacity-50' : ''}`}
  >
    <Text className={active ? 'text-white' : 'text-neutral-800'}>{label}</Text>
  </Pressable>
);

export default function ChatHeader({ manualAgent, assignedAgent, locked, onSelect, onNewThread }: Props) {
  const disabled = !!locked;

  return (
    <View className="px-4 pt-3 pb-2">
      <View className="flex-row mb-2">
        <Pill label="司令塔(自動)" active={manualAgent==='auto' && !assignedAgent} onPress={()=>onSelect('auto')} disabled={disabled}/>
        <Pill label="家庭教師"     active={manualAgent==='tutor'}      onPress={()=>onSelect('tutor')} disabled={disabled}/>
        <Pill label="進路"         active={manualAgent==='counselor'}  onPress={()=>onSelect('counselor')} disabled={disabled}/>
        <Pill label="学習計画"     active={manualAgent==='planner'}    onPress={()=>onSelect('planner')} disabled={disabled}/>
      </View>

      <Pressable onPress={onNewThread} className="self-start bg-neutral-100 px-3 py-2 rounded-lg mb-2">
        <Text><Plus size={14} /> 新しいスレッドを開始</Text>
      </Pressable>

      <Text className="text-xs text-neutral-500">
        『判定中…』→『ご案内します』→キャラクター→自動遷移の順に表示します。
      </Text>

      {locked && (
        <View className="mt-6 flex-row items-center">
          <Lock size={16} color="#6b7280" />
          <Text className="ml-1 text-xs text-neutral-500">
            担当が確定しました。変更するには『新しいスレッドを開始』してください。
          </Text>
        </View>
      )}
    </View>
  );
}
