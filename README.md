# kusoogle（クソーグル）

クソアプリ開発者のためのクソアプリ検索エンジン

## 📖 概要

クソアプリアドベントカレンダーに参加する前に、自分のアイデアと類似したクソアプリが過去に存在しないか確認するための検索エンジンです。

**コンセプト**: 「用途はクソだが、中身は無駄に高度」

意味的類似性を理解するベクトル検索を実装し、単なるキーワードマッチングではなく、意味的に似たクソアプリを見つけることができます。

## ⚖️ 利用規約遵守

- **非商用プロジェクト**: 本プロジェクトは非商用で運営されており、広告や収益化は行いません
- **Qiita利用規約遵守**: Qiita API v2を使用し、利用規約を遵守しています
- **記事本文の扱い**: 記事本文はEmbedding生成にのみ一時的に使用し、保存・表示はしません（著作権保護のため）
- **ベクトルのみ保存**: 記事本文自体は保存せず、ベクトル化された数値配列のみを保存します
- **出典表示**: 検索結果には「出典: Qiita」を表示し、各記事へのリンクを提供します

## 🎯 機能

### Phase 1（MVP）
- ✅ クソアプリアドベントカレンダーの記事を自動収集
- ✅ ベクトル検索による類似記事の検索
- ✅ 検索結果の一覧表示

### Phase 2（予定）
- 🔄 類似アプリの説明機能（LLMによる説明生成）

## 🏗️ アーキテクチャ

- **フロントエンド**: Next.js (TypeScript)
- **バックエンド**: Cloudflare Workers (TypeScript)
- **ベクトルDB**: Cloudflare Vectorize
- **AI**: Cloudflare AI Workers

詳細は [アーキテクチャ仕様書](./docs/01_architecture.md) を参照してください。

## 📚 ドキュメント

- [要件定義書](./docs/00_requirements.md)
- [アーキテクチャ仕様書](./docs/01_architecture.md)
- [実装仕様書](./docs/02_implementation.md)
- [考慮事項・曖昧な点](./docs/03_considerations.md)
- [Qiita利用規約遵守レビュー](./docs/04_qiita-compliance-review.md)

## 🚀 セットアップ

### 必要な環境
- Bun 1.0以上
- Node.js 18以上（Next.js用）
- Cloudflareアカウント（デプロイ用）

### インストール

```bash
# 依存関係のインストール
bun install
```

### 開発環境の起動

```bash
# すべてのアプリを起動
bun run dev

# フロントエンドのみ
bun run dev:frontend

# Search API Workerのみ
bun run dev:search

# Data Collection Workerのみ
bun run dev:data-collection
```

### ビルド

```bash
# すべてのアプリをビルド
bun run build

# 共有パッケージのみビルド
bun run build:shared
```

### 型チェック

```bash
# すべてのパッケージの型チェック
bun run typecheck
```

詳細な実装手順は [実装計画書](./docs/implementation-plans/v1.0.0.md) を参照してください。

## 🚢 デプロイ

### デプロイ手順

詳細な手順は [デプロイガイド](./docs/guides/deployment-guide.md) を参照してください。

### クイックスタート

```bash
# Cloudflare Workersのデプロイ
bun run deploy:workers

# Cloudflare Pagesのデプロイ
bun run deploy:frontend
```

### 初期データ取得

```bash
# 初期データを取得（ローカル環境）
bun run initialize-data
```

## 📝 ライセンス

本プロジェクトは [MIT License](LICENSE) の下で公開されています。

**注意**: 本プロジェクト自体は非商用で運営されていますが、コードの再利用はMIT Licenseに従って自由に行えます。ただし、Qiitaのデータを使用する場合は、Qiitaの利用規約を遵守してください。

## 🙏 謝辞

- [クソアプリアドベントカレンダー](https://qiita.com/advent-calendar/2025/kuso-app)
- Qiita API
