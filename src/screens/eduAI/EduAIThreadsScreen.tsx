import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Text, Pressable, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getEduAIThreads, EduAIThread, removeEduAIThread, renameEduAIThread,
  setEduAICurrentThreadId, setEduAIRouterPreset
} from '@/storage/eduAIStorage';
import { MoreHorizontal, Plus, Pencil, Trash2, Rocket, ShieldCheck, Search } from 'lucide-react-native';

// ★ 追加: Functions を直接叩くため
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, ensureSignedIn } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

type AgentKey = 'auto'|'tutor'|'counselor'|'planner';
type FilterKey = 'all'|'tutor'|'counselor'|'planner'|'draft';

const AGENT_BADGE: Record<'tutor'|'counselor'|'planner'| 'null', {label:string; ring:string; glow:string; bg:string}> = {
  tutor:      { label:'家庭教師',       ring:'ring-blue-500',      glow:'shadow-blue-300',      bg:'bg-blue-50' },
  counselor:  { label:'進路カウンセラー', ring:'ring-emerald-500',   glow:'shadow-emerald-300',   bg:'bg-emerald-50' },
  planner:    { label:'学習計画',       ring:'ring-violet-500',    glow:'shadow-violet-300',    bg:'bg-violet-50' },
  null:       { label:'未確定',         ring:'ring-slate-400',     glow:'shadow-slate-300',     bg:'bg-slate-50' },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key:'all',        label:'すべて' },
  { key:'tutor',      label:'家庭教師' },
  { key:'counselor',  label:'進路' },
  { key:'planner',    label:'学習計画' },
  { key:'draft',      label:'未確定' },
];

export default function EduAIThreadsScreen() {
  const nav = useNavigation<any>();
  const [threads, setThreads] = useState<EduAIThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<{open:boolean; t?:EduAIThread}>({open:false});
  const [rename, setRename] = useState<{open:boolean; t?:EduAIThread; text:string}>({open:false, text:''});
  const [creator, setCreator] = useState<{open:boolean}>({open:false});
  const [filter, setFilter] = useState<FilterKey>('all');

  // ping 実行中フラグ（テスト関数用）
  const [pinging, setPinging] = useState(false);

  const load = () => setThreads(getEduAIThreads().sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0)));
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return threads;
    if (filter === 'draft') return threads.filter(t => !t.agent);
    return threads.filter(t => t.agent === filter);
  }, [threads, filter]);

  const openThread = (t: EduAIThread) => {
  setEduAICurrentThreadId(t.id);
  // 既存のセットも保存（司令塔に行くケース＝未確定時のみ）
  setEduAIRouterPreset((t.agent ?? 'auto') as AgentKey);
  if (t.agent === 'tutor')       nav.navigate('EduAITutor');
  else if (t.agent === 'counselor') nav.navigate('EduAICounselor');
  else if (t.agent === 'planner')   nav.navigate('EduAIPlanner');
  else                               nav.navigate('EduAIRouter'); // ← 未確定は司令塔へ
};


  const startThread = (preset: AgentKey) => {
    setCreator({open:false});
    setEduAICurrentThreadId('');
    setEduAIRouterPreset(preset);
    nav.navigate('EduAIRouter');
  };

   // Functions 到達テスト用
  const handlePing = async () => {
    try {
      setPinging(true);
      await ensureSignedIn();
      const functions = getFunctions(app, 'asia-northeast1');
      const { data } = await httpsCallable<any, { ok:boolean; uid:string|null; appId:string|null; now:string }>(functions, 'ping')({});
      console.log('[ping result]', data);
      Alert.alert(
        'Functions接続テスト',
        `OK\nuid: ${data.uid}\nappId: ${data.appId}\nnow: ${data.now}`
      );
    } catch (err:any) {
      const code = (err?.code || err?.message || String(err));
      console.warn('[ping error]', err);
      Alert.alert('Functions接続テスト', `NG: ${code}`);
    } finally {
      setPinging(false);
    }
  };
  // 画面コンポーネント内に関数を追加
const handleWhoAmI = async () => {
  try {
    setPinging(true);
    await ensureSignedIn();
    const pid = (app.options as any)?.projectId as string;
    const url = `https://asia-northeast1-${pid}.cloudfunctions.net/whoami`;
    const idToken = await getAuth(app).currentUser!.getIdToken(true);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const j = await r.json();
    Alert.alert('HTTP検証 (whoami)', JSON.stringify(j, null, 2));
  } catch (e: any) {
    Alert.alert('HTTP検証 (whoami)', 'NG: ' + (e?.message || String(e)));
  } finally {
    setPinging(false);
  }
};

  const Item = ({ t }: { t: EduAIThread }) => {
    const key = (t.agent ?? 'null') as keyof typeof AGENT_BADGE;
    const badge = AGENT_BADGE[key];
    return (
      <Pressable onPress={() => openThread(t)} className="px-4">
        <View
          className={`mt-3 rounded-2xl ${badge.bg} border border-white/60 ring-1 ${badge.ring} shadow-md ${badge.glow}`}
          style={{ overflow:'hidden' }}
        >
          <View className="flex-row items-center px-4 pt-3">
            <View className={`w-2 h-2 rounded-full mr-2 ${badge.ring.replace('ring-','bg-')}`} />
            <Text className="text-xs text-neutral-500">
              {key === 'null' ? '未確定' : AGENT_BADGE[key].label}
              <Text className="text-neutral-400"> ・ {new Date(t.updatedAt||0).toLocaleString()}</Text>
            </Text>
            <Pressable onPress={() => setMenu({ open:true, t })} hitSlop={10} className="ml-auto p-2 -mr-2">
              <MoreHorizontal size={18} color="#6b7280" />
            </Pressable>
          </View>

          <View className="px-4 py-3">
            <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>{t.title}</Text>
            {!!t.lastMessagePreview && (
              <Text className="text-[12px] text-neutral-600 mt-1" numberOfLines={2}>
                {t.lastMessagePreview}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-12 pb-3 border-b border-neutral-200">
        <Text className="text-2xl font-extrabold tracking-tight">EduAI チャット</Text>
        <Text className="text-xs text-neutral-500 mt-1">スレッドを選択して続きから会話できます</Text>

        {/* 接続テストボタン */}
        <View className="flex-row mt-2">
          <Pressable
            onPress={handlePing}
            disabled={pinging}
            className={`ml-auto px-3 py-1.5 rounded-full ${pinging ? 'bg-neutral-300' : 'bg-neutral-900'}`}
          >
            <Text className="text-white text-xs">{pinging ? 'Testing…' : 'Functions接続テスト'}</Text>
          </Pressable>
          <Pressable onPress={handleWhoAmI} disabled={pinging}
    className={`ml-2 px-3 py-1.5 rounded-full ${pinging ? 'bg-neutral-300' : 'bg-indigo-700'}`}>
    <Text className="text-white text-xs">HTTP検証</Text>
  </Pressable>
        </View>


        {/* Filter pills */}
        <View className="flex-row mt-3">
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3 py-1.5 mr-2 rounded-full border ${
                filter === f.key ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'
              }`}
            >
              <Text className={filter === f.key ? 'text-white' : 'text-neutral-800'}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(x)=>x.id}
        renderItem={({item}) => <Item t={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); setRefreshing(false); }} />
        }
        ListEmptyComponent={
          <View className="px-4 py-16 items-center">
            <Rocket size={32} color="#111827" />
            <Text className="mt-2 text-neutral-600">まだスレッドがありません。右下の + から作成できます。</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* FAB（＋） */}
      <View className="absolute right-5 bottom-8">
        <Pressable onPress={()=>setCreator({open:true})}
          className="w-14 h-14 rounded-full bg-neutral-900 items-center justify-center shadow-xl"
        >
          <Plus color="white" size={26} />
        </Pressable>
      </View>

      {/* Bottom-sheet: 新規作成プリセット */}
      <Modal visible={creator.open} transparent animationType="fade" onRequestClose={()=>setCreator({open:false})}>
        <Pressable className="flex-1 bg-black/40" onPress={()=>setCreator({open:false})}>
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-3">
            <Text className="text-base font-semibold px-1 pb-1">新しいスレッド</Text>
            <Pressable onPress={()=>startThread('auto')} className="px-3 py-3 rounded-xl bg-slate-50 mb-2 flex-row items-center">
              <ShieldCheck size={18} color="#111827" /><Text className="ml-2">司令塔（自動判定）</Text>
            </Pressable>
            <Pressable onPress={()=>startThread('tutor')} className="px-3 py-3 rounded-xl bg-blue-50 mb-2">
              <Text className="text-blue-700">家庭教師で開始</Text>
            </Pressable>
            <Pressable onPress={()=>startThread('counselor')} className="px-3 py-3 rounded-xl bg-emerald-50 mb-2 flex-row items-center">
              <Search size={18} color="#059669" /><Text className="ml-2 text-emerald-700">進路カウンセラーで開始</Text>
            </Pressable>
            <Pressable onPress={()=>startThread('planner')} className="px-3 py-3 rounded-xl bg-violet-50">
              <Text className="text-violet-700">学習計画で開始</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Overflow menu（リネーム/削除） */}
      <Modal visible={menu.open} transparent animationType="fade" onRequestClose={()=>setMenu({open:false})}>
        <Pressable className="flex-1 bg-black/40" onPress={()=>setMenu({open:false})}>
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-2">
            <Pressable
              onPress={() => { setMenu({open:false}); setRename({open:true, t:menu.t, text:menu.t?.title||''}); }}
              className="flex-row items-center px-3 py-3"
            >
              <Pencil size={18} color="#111827" /><Text className="ml-2 text-base">名前を変更</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if(!menu.t) return;
                Alert.alert('削除', 'このスレッドを削除しますか？', [
                  { text:'キャンセル', style:'cancel' },
                  { text:'削除', style:'destructive', onPress:()=>{ removeEduAIThread(menu.t!.id); load(); setMenu({open:false}); } }
                ]);
              }}
              className="flex-row items-center px-3 py-3"
            >
              <Trash2 size={18} color="#b91c1c" /><Text className="ml-2 text-base text-red-700">削除</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* rename modal */}
      <Modal visible={rename.open} transparent animationType="fade" onRequestClose={()=>setRename({open:false, text:''})}>
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="mb-2 font-medium">スレッド名を編集</Text>
            <TextInput
              value={rename.text}
              onChangeText={(v)=>setRename(s=>({...s,text:v}))}
              placeholder="スレッド名"
              className="border border-neutral-300 rounded-lg px-3 py-2"
            />
            <View className="flex-row justify-end mt-3">
              <Pressable onPress={()=>setRename({open:false, text:''})} className="px-3 py-2 mr-2 rounded-md bg-neutral-200">
                <Text>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={()=>{
                  if (rename.t && rename.text.trim()) renameEduAIThread(rename.t.id, rename.text.trim());
                  setRename({open:false, text:''}); load();
                }}
                className="px-3 py-2 rounded-md bg-neutral-900"
              >
                <Text className="text-white">保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
