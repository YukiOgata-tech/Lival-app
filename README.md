# 教育特化AIモバイルアプリ「Lival」

教育に特化した AI を活用し、デジタルデトックスや集中セッションを“個人/グループ”で楽しく習慣化する React Native（Expo）アプリです。集中結果の可視化・ランキング、AI 家庭教師/学習計画/進路カウンセラー、OCR/翻訳ツール、招待・通知などを備えています。

最終更新: 2025-08

---

## 主な機能

- グループ集中セッション: ルーム作成/参加、招待送信、終了通知、結果画面（ランキング等）
- AI チャット（EduAI）:
  - 家庭教師: 数式は TeX 記法で最適表示（`\( ... \)` / `$$ ... $$`）。画像は「テキスト化プレビュー → 送信」の二段構成
  - 学習計画: 会話モード/計画作成モードを切替、期間（1w/2w/1m/2m/1y）・優先項目を指定してプラン生成
  - 進路カウンセラー: Web 検索オプション、Standard/Premium 品質切替、出典/根拠の明示
- AI ツール: 画像 OCR チャット、翻訳（Gemini, フォーマル/カジュアル、英韓中日）
- 友だち/招待: 申請/承認、ルーム招待のプッシュ通知、受信箱
- 通知: Expo Push によるルーム終了/招待の通知（通知タップで該当画面へ遷移）

---

## アーキテクチャ概要

- モバイルクライアント: React Native 0.79 + Expo SDK 53 + React 19 + TypeScript
  - UI: React Native Paper、NativeWind（Tailwind）
  - 状態/通信: React Query、Firebase（Auth/Firestore/Storage/Functions）、Algolia（検索）
  - AI: Firebase AI (Gemini) をクライアントから利用（翻訳等）
- バックエンド: Firebase（Functions v2/Firestore/Storage/Emulator）
  - Functions(Node 22, TypeScript): OpenAI Responses API を利用する EduAI 各種 onCall 関数、Cloud Tasks 連携、招待通知など
  - Firestore ルール: ルーム/チャット/プレゼンス/結果/招待/フレンド周りの細かな権限制御

---

## 技術スタック（主要）

- クライアント: Expo, React Native, TypeScript, React 19, React Navigation, React Query
- UI/スタイル: react-native-paper, NativeWind/Tailwind, Lottie
- Firebase: Auth, Firestore, Storage, Functions, Emulator UI
- AI: OpenAI（Functions 側）, Firebase AI/Gemini（クライアント側）
- その他: Algolia 検索、expo-notifications, MMKV（ローカルストレージ）

---

## ディレクトリ

- `src/` アプリ本体
  - `navigation/` 画面ルーティング（React Navigation）
  - `screens/` 画面（セッション/EduAI/認証/プロフィール等）
  - `components/` UI コンポーネント
  - `lib/` Firebase 初期化、EduAI クライアント、Gemini ツール等
  - `providers/` 認証・通知のコンテキスト
  - `storage/` MMKV ベースのローカル保存（EduAI スレッド/メッセージ等）
- `functions/` Firebase Functions（v2, Node 22, TypeScript）
- `firestore.rules` Firestore セキュリティルール
- `ios/` iOS ネイティブプロジェクト（EAS/Prebuild 用）

---

## Firebase Functions（主要エンドポイント）

呼び出し（onCall, リージョン: asia-northeast1）

- `eduAITutorChat`: 数学チューター。画像同梱/テキスト化プレビュー、TeX 表記最適化
- `eduAIPlannerChat`: 学習計画。会話/計画モード、期間/優先指定
- `eduAICounselorChat`: 進路カウンセラー。Web 検索ツール、Standard/Premium
- `ping`: 接続/権限チェック用

HTTP（onRequest）

- `eduAIClassify`: ルーティング（tutor/counselor/planner）判定。DeepSeek→OpenAI フォールバック
- `whoami`: Bearer ID トークン検証
- `endRoomByTask`: Cloud Tasks からのセッション自動終了ハンドラ

イベントトリガ

- `scheduleRoomAutoEnd`: `rooms/{roomId}`の開始検知→Cloud Tasks に終了タスク登録
- `onGroupSessionEnded`: ルーム終了時に XP/コイン付与、ランキング/ボーナス反映
- `onRoomInviteCreated`: 招待作成→Expo Push 送信

---

## Firestore セキュリティ（抜粋）

- `users/{uid}`: 基本情報更新の許可フィールドを限定（displayName, bio, photoURL, …）
- `rooms/{roomId}`: ホストのみがセッション状態等を更新、`seenBy` は本人のみ更新可
- `rooms/{roomId}/groupChats`/`aiChats`/`presence`/`results`/`tasks`: メンバーのみアクセス可能
- `roomInvites`/`invites`: 送信者/受信者/ホストの条件で読み書きを制御

---

## セットアップ

前提: Node 18+（アプリ）, Node 22（Functions）, npm, Expo CLI, Firebase CLI, Xcode/Android Studio

1) 依存関係のインストール

```sh
npm install
```

2) 環境変数を設定（フロント/.env）

```env
# Firebase (Public)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# 任意: EduAI ルーター HTTP の明示 URL（省略時は projectId から自動組立）
EXPO_PUBLIC_EDUAI_CLASSIFY_URL=https://asia-northeast1-<project-id>.cloudfunctions.net/eduAIClassify
```

3) iOS/Android の設定ファイルを配置

- iOS: `GoogleService-Info.plist`
- Android: `google-services.json`

4) Expo で起動

```sh
npm run start
# iOS/Android 実機/Simulator
npm run ios
npm run android
```

---

## 通知（expo-notifications）

- アプリ起動時に通知チャンネル登録（Android）/権限リクエスト→Expo Push Token を `users/{uid}.expoPushTokens` に保存
- 通知タップで該当画面に遷移（ルーム終了/招待）

---

## Firebase Emulator / デプロイ

Functions（開発）

```sh
cd functions
npm ci
npm run serve   # ビルド→エミュレーター起動（functions/firestore）
```

Secrets（本番）

```sh
firebase functions:secrets:set OPENAI_API_KEY
# （オプション）DeepSeek を使う場合
firebase functions:secrets:set DEEPSEEK_API_KEY
```

デプロイ

```sh
firebase deploy --only functions
```

---

## Cloud Tasks での自動終了

- 環境変数（Functions 側）
  - `TASKS_LOCATION`（例: `asia-northeast1`）
  - `TASK_QUEUE_NAME`（例: `room-auto-end-queue`）
  - `TASK_HANDLER_URL`（`endRoomByTask` の公開 URL）
  - `TASK_SECRET`（検証用トークン）
- GCP 側で Cloud Tasks キューを同リージョンに作成
- ルーム開始を検知すると指定時刻に HTTP POST をスケジュールし、未終了なら `status: 'ended'` を設定

---

## iOS/Android 権限

- iOS: カメラ/写真/マイク/通知の `Info.plist` 文言を `app.config.ts` に定義済み
- Android: `CAMERA`/`READ_MEDIA_IMAGES` などを定義、Edge-to-Edge 有効

---

## メモ・既知事項

- React 19/Expo SDK 53/Hermes、新アーキテクチャ有効
- `expo-router` はプラグイン導入済みだが、実装は React Navigation を採用
- ローカルストレージ: MMKV を使用（EduAI スレッド/メッセージ/タグを永続化）

---

By Yuki Ogata  
ogaogayu01@gmail.com
