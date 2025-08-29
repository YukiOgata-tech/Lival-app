# Repository Guidelines

## プロジェクト構成
- `src/`: アプリ本体（React Native 0.79 + Expo SDK 53 + React 19）
  - `components/`, `screens/`, `hooks/`, `lib/`, `navigation/`, `providers/`, `storage/`, `theme/`, `types/`, `constants/`
- `assets/`: 画像・フォント・Lottie
- `functions/`: Firebase Functions v2（Node 22, TypeScript）。ソースは `functions/src`、ビルドは `functions/lib`
- 主要設定: `App.tsx`, `index.ts`, `app.config.ts`, `tsconfig.json`, `tailwind.config.js`, `metro.config.js`

## ビルド・実行・開発
- クライアント: `npm start`（別名: `npm run ios` / `npm run android` / `npm run web`）
- Expo 再起動: `npx expo start -c`
- Functions ビルド: `npm --prefix functions run build`
- Functions エミュレータ: `npm --prefix functions run serve`
- Functions Lint: `npm --prefix functions run lint`
- デプロイ（要レビュー）: `npm --prefix functions run deploy`

## コーディング規約・命名
- TypeScript、インデント 2 スペース。厳密な型付けと単一責務を徹底
- コンポーネント: PascalCase（例: `FriendPicker.tsx`）／フック: `use` + camelCase（例: `useSegments.ts`）
- ユーティリティ/型: `.ts`（例: `firebase.ts`, `AItoolsChatTypes.ts`）
- スタイル: Tailwind（`nativewind`）。クラス順序は安定化。Prettier + Tailwind プラグイン推奨
- Functions: ESLint（Google 設定）準拠

## テスト・検証
- シュミレーターでのテストコマンドは開発者が実行するので、提案はしてもいいが

## コミット & PR
- コミット: Conventional Commits 推奨（例: `feat:`, `fix:`, `chore(functions):`）。命令形・簡潔に
- PR: 要約、関連 Issue、UI Before/After（スクショ/動画）、影響プラットフォーム、移行手順を記載
- 検証: `npm start` で基本フロー、`npm --prefix functions run serve` で Functions を確認。`deploy` はレビュー後

## セキュリティ・設定
- 秘密情報はコミットしない。フロントは `.env`、Functions は `functions/.env.local`
- Expo 公開変数は `EXPO_PUBLIC_` 接頭を使用
- Functions の Node は `functions/package.json` の `"node": "22"` に合わせる。Secrets は Firebase CLI で設定
