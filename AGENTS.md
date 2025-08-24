# Repository Guidelines

## プロジェクト構成とモジュール
- アプリ本体: `src/` — 主な配下は `components/`, `screens/`, `hooks/`, `lib/`, `navigation/`, `providers/`, `storage/`, `theme/`, `types/`, `constants/`。
- アセット: `assets/`（画像・フォント・Lottie など）。
- Firebase Cloud Functions: `functions/`（TypeScript は `functions/src`、ビルド成果物は `functions/lib`）。
- エントリ/設定: `App.tsx`, `index.ts`, `app.config.ts`, `tsconfig.json`, `tailwind.config.js`, `metro.config.js`。

## ビルド・テスト・開発コマンド
- アプリ起動（Metro）: `npm start`（別名: `npm run ios` / `npm run android` / `npm run web`）。
- Functions ビルド: `npm --prefix functions run build`。
- Functions エミュレータ: `npm --prefix functions run serve`（ビルド後、Functions の Firebase Emulator を起動）。
- Functions Lint: `npm --prefix functions run lint`。
- Functions デプロイ: `npm --prefix functions run deploy`。

## コーディング規約と命名
- 言語: TypeScript（React Native + Expo Router）。
- インデント: 2 スペース。型付け・責務を明確に。
- コンポーネント: PascalCase（例: `FriendPicker.tsx`）。
- フック: `use` 接頭の camelCase（例: `useSegments.ts`）。
- ユーティリティ/型: `.ts`（例: `firebase.ts`, `AItoolsChatTypes.ts`）。
- スタイル: Tailwind（`nativewind`）。クラス順序は安定化。Prettier + Tailwind プラグイン推奨。
- Functions 側 Lint: ESLint（Google 設定）。

## テスト方針
- 公式な単体テストは未整備。まずは iOS/Android/Web の手動 QA を優先。
- バックエンド動作は Firebase Emulator で検証: `npm --prefix functions run serve` を実行し、アプリから主要フローを踏む。
- テストを追加する場合は `functions/` に配置し、Jest 等のスクリプトは別 PR で導入。

## コミットと PR ガイドライン
- コミット形式は混在傾向。可能なら Conventional Commits（例: `feat:`, `fix:`, `chore(functions):`）を推奨。命令形で簡潔に。
- PR には要約・関連 Issue・UI 変更の Before/After（スクショ/動画）、影響プラットフォーム（iOS/Android/Web）と移行手順を記載。
- 検証: `npm start` で基本フロー確認。バックエンド変更は `npm --prefix functions run serve` で確認（`deploy` はレビュー後）。

## セキュリティと設定
- 秘密情報はコミットしない。アプリは `.env`、Functions は `.env.local` を使用。Expo 公開環境変数は `EXPO_PUBLIC_` 接頭を使用。
- Functions の Node バージョン（`functions/package.json` の `"node": "22"`）に合わせる。
