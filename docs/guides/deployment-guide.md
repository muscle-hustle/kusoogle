# デプロイガイド

## 概要

このガイドでは、kusoogleをCloudflare WorkersとCloudflare Pagesにデプロイする手順を説明します。

## 前提条件

1. **Cloudflareアカウント**
   - Cloudflareアカウントを作成していること
   - `wrangler login`でログインしていること

2. **必要なツール**
   - Bun 1.0+
   - Wrangler CLI（`bunx wrangler`で利用可能）

3. **Vectorizeインデックスの作成**
   - 本番環境用のVectorizeインデックスが作成されていること

## デプロイ手順

### 1. Vectorizeインデックスの作成（初回のみ）

本番環境用のVectorizeインデックスを作成します。

```bash
bunx wrangler vectorize create kusoogle-articles --dimensions=768 --metric=cosine
```

**注意**: 既にインデックスが存在する場合は、この手順はスキップしてください。

### 2. Cloudflare Workersのデプロイ

#### 2.1 Search API Workerのデプロイ

```bash
bun run deploy:search
```

または、直接実行：

```bash
cd apps/workers/search
bun run deploy
```

#### 2.2 Data Collection Workerのデプロイ

```bash
bun run deploy:data-collection
```

または、直接実行：

```bash
cd apps/workers/data-collection
bun run deploy
```

#### 2.3 両方のWorkerを一度にデプロイ

```bash
bun run deploy:workers
```

### 3. 環境変数とシークレットの設定

#### 3.1 Search API Worker

環境変数は`wrangler.toml`で設定済みです。追加の設定が必要な場合は、Cloudflare Dashboardから設定できます。

#### 3.2 Data Collection Worker

**シークレットの設定**:

```bash
cd apps/workers/data-collection

# Qiita APIアクセストークン（オプショナル、レート制限緩和のため推奨）
bunx wrangler secret put QIITA_ACCESS_TOKEN

# 初期データ取得エンドポイント用のシークレットトークン（推奨）
bunx wrangler secret put INITIALIZE_SECRET
```

**環境変数の設定**:

`wrangler.toml`の`[vars]`セクションで設定できます。本番環境用の設定を追加する場合は、`wrangler.toml`を編集するか、Cloudflare Dashboardから設定してください。

### 4. Cloudflare Pagesのデプロイ

#### 4.1 ビルド

```bash
cd apps/frontend
bun run build
```

#### 4.2 デプロイ

**方法1: Wrangler CLIを使用（推奨）**

```bash
cd apps/frontend
bunx wrangler pages deploy .next
```

**方法2: Cloudflare Dashboardからデプロイ**

1. Cloudflare Dashboardにログイン
2. 「Workers & Pages」→「Create application」→「Pages」を選択
3. プロジェクトを接続（GitHubリポジトリを接続するか、直接アップロード）
4. ビルド設定を指定：
   - Build command: `cd apps/frontend && bun run build`
   - Build output directory: `apps/frontend/.next`
   - Root directory: `/`（プロジェクトルート）

#### 4.3 環境変数の設定

Cloudflare Pagesの環境変数を設定します：

1. Cloudflare Dashboard → 「Workers & Pages」→ プロジェクトを選択
2. 「Settings」→「Environment variables」を開く
3. 以下の環境変数を設定：
   - `NEXT_PUBLIC_SEARCH_API_URL`: Search API WorkerのURL（例: `https://kusoogle-search.your-subdomain.workers.dev`）

### 5. 動作確認

#### 5.1 Search API Workerの確認

```bash
# ヘルスチェック
curl https://kusoogle-search.your-subdomain.workers.dev/health

# 検索APIのテスト
curl -X POST https://kusoogle-search.your-subdomain.workers.dev/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"タスク管理"}'
```

#### 5.2 Data Collection Workerの確認

```bash
# ヘルスチェック
curl https://kusoogle-data-collection.your-subdomain.workers.dev/health
```

#### 5.3 フロントエンドの確認

ブラウザでCloudflare PagesのURLにアクセスし、以下を確認：

1. ページが正しく表示される
2. 検索フォームが表示される
3. 検索が動作する
4. 検索結果が表示される

## デプロイ後の確認事項

### 1. Vectorizeインデックスの確認

```bash
# インデックスの一覧を確認
bunx wrangler vectorize list

# インデックスの詳細を確認
bunx wrangler vectorize describe kusoogle-articles
```

### 2. Workerのログ確認

Cloudflare Dashboard → 「Workers & Pages」→ Workerを選択 → 「Logs」タブでログを確認できます。

### 3. パフォーマンスの確認

- 検索の応答時間
- エラーレート
- リクエスト数

## トラブルシューティング

### エラー: Vectorizeインデックスが見つからない

**原因**: Vectorizeインデックスが作成されていない、または名前が間違っている

**対処法**:
```bash
# インデックスを作成
bunx wrangler vectorize create kusoogle-articles --dimensions=768 --metric=cosine
```

### エラー: AI Workersエラー（error code: 1031）

**原因**: AI Workersの設定が正しくない、またはクォータに達している

**対処法**:
- Cloudflare DashboardでAI Workersの設定を確認
- クォータを確認

### エラー: 検索結果が空

**原因**: Vectorizeインデックスにデータが登録されていない

**対処法**:
1. 初期データ取得を実行
2. Vectorizeインデックスのデータを確認

### エラー: CORSエラー

**原因**: フロントエンドとSearch API Workerのオリジンが異なる

**対処法**:
- `apps/workers/search/src/index.ts`のCORS設定を確認
- 本番環境のオリジンを許可リストに追加

## 本番環境での注意事項

1. **シークレットトークンの設定**
   - `INITIALIZE_SECRET`は必ず設定してください
   - 本番環境では認証なしでのアクセスを許可しないでください

2. **環境変数の設定**
   - `ENVIRONMENT=production`を設定してください
   - 本番環境用のURLを設定してください

3. **レート制限**
   - Qiita APIのレート制限を遵守してください
   - `QIITA_ACCESS_TOKEN`を設定することでレート制限が緩和されます

4. **モニタリング**
   - Cloudflare Dashboardでログとメトリクスを確認してください
   - エラーが発生した場合は、ログを確認して対処してください

## 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

