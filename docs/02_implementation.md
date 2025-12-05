# クソアプリ検索エンジン「kusoogle」実装仕様書

## 1. プロジェクト構成

### 1.1 ディレクトリ構造

```
kusoogle/
├── apps/
│   ├── frontend/              # Next.js フロントエンド
│   │   ├── app/
│   │   │   ├── page.tsx       # トップページ
│   │   │   ├── layout.tsx     # レイアウト
│   │   │   └── api/           # API Routes（必要に応じて）
│   │   ├── components/        # React コンポーネント
│   │   │   ├── SearchForm.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   └── ExplanationCard.tsx  # Phase 2
│   │   ├── lib/              # ユーティリティ
│   │   └── types/            # TypeScript型定義
│   └── workers/              # Cloudflare Workers
│       ├── search/           # Search API Worker
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   └── handlers/
│       │   └── wrangler.toml
│       ├── data-collection/  # Data Collection Worker
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   └── handlers/
│       │   └── wrangler.toml
│       └── explain/          # Explanation API Worker (Phase 2)
│           ├── src/
│           │   ├── index.ts
│           │   └── handlers/
│           └── wrangler.toml
├── packages/                 # 共有パッケージ
│   └── shared/              # 共通型定義・ユーティリティ
│       ├── types/
│       └── utils/
├── config/                   # 設定ファイル
│   └── calendars.json        # 対象カレンダー設定
├── scripts/                  # スクリプト
│   └── initialize-data.ts    # 初期データ取得スクリプト
├── docs/                     # ドキュメント
│   ├── 00_requirements.md
│   ├── 01_architecture.md
│   ├── 02_implementation.md
│   ├── 03_considerations.md
│   └── 04_qiita-compliance-review.md
└── README.md
```

### 1.2 モノレポ構成
- **Bun workspaces** を使用
- フロントエンドとWorkersを独立して管理
- 共通の型定義を共有パッケージで管理
- Bunの高速なパッケージ管理とビルドを活用

## 2. フロントエンド実装

### 2.1 ページ構成

#### 2.1.1 トップページ (`app/page.tsx`)
- 検索フォーム
- 検索結果表示エリア
- 説明表示エリア（Phase 2）

#### 2.1.2 レイアウト (`app/layout.tsx`)
- メタデータ設定
- グローバルスタイル
- プロバイダー設定

### 2.2 主要コンポーネント

#### 2.2.1 SearchForm
**役割**: 検索クエリの入力を受け付ける

**実装方針**:
- Server Actionを使用（Next.js 15の機能を活用）
- Cloudflare WorkersのSearch APIを呼び出す
- リアルタイム検索は実装しない（コスト削減）
- フォーム送信で検索実行
- 入力検証: 1文字以上500文字以下、特殊文字のサニタイズ

**Props**:
```typescript
interface SearchFormProps {
  onSearch: (query: string) => Promise<void>;
}
```

**Server Actionの実装例**:
```typescript
'use server';

export async function searchArticles(query: string) {
  // Cloudflare WorkersのSearch APIを呼び出し
  const response = await fetch(`${SEARCH_API_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await response.json();
}
```

#### 2.2.2 SearchResults
**役割**: 検索結果を一覧表示

**実装方針**:
- React Server Componentsで実装
- スケルトンUIでローディング状態を表示
- 無限スクロールは実装しない（topK=10で固定）

**Props**:
```typescript
interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
}
```

#### 2.2.3 ArticleCard
**役割**: 個別の記事カードを表示

**表示項目**:
- 著者
- 記事タイトル
- URL（リンク、「Qiitaで読む」）
- 投稿日時
- タグ
- いいね数
- 類似度スコア
- 出典表示（「出典: Qiita」）

**Props**:
```typescript
interface ArticleCardProps {
  article: SearchResult;
}
```

#### 2.2.4 ExplanationCard（Phase 2）
**役割**: 類似アプリの説明を表示

**実装方針**:
- 検索結果表示後に非同期で取得
- スケルトンUIでローディング状態を表示

**Props**:
```typescript
interface ExplanationCardProps {
  query: string;
  articleIds: string[];
}
```

### 2.3 状態管理

#### 2.3.1 クライアント状態
- React Hooks（useState, useEffect）で管理
- 複雑化した場合はZustandを検討

#### 2.3.2 サーバー状態
- Server Actionsで管理
- React Server Componentsでデータ取得

### 2.4 スタイリング

#### 2.4.1 Tailwind CSS
- ユーティリティファーストのアプローチ
- カスタムテーマを設定
- ダークモード対応（将来検討）

#### 2.4.2 コンポーネントスタイル
- インラインスタイルは避ける
- Tailwindのクラスで統一

## 3. バックエンド実装

### 3.1 Search API Worker

#### 3.1.1 フレームワーク
- **Hono**を使用
- TypeScriptで型安全に実装

#### 3.1.2 エンドポイント
```
POST /api/search
```

#### 3.1.3 リクエストハンドラー
```typescript
// 疑似コード
app.post('/api/search', async (c) => {
  const { query } = await c.req.json();
  
  // 1. クエリをEmbedding化
  const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: query
  });
  
  // 2. Vectorizeで検索
  const results = await env.VECTORIZE_INDEX.query(embedding.data[0], {
    topK: 10,
    returnMetadata: true
  });
  
  // 3. 結果を整形（記事本文の要約は含めない）
  const formattedResults = formatResults(results);
  
  return c.json({ results: formattedResults });
});
```

#### 3.1.4 エラーハンドリング

**エラーケースと処理**:
- **バリデーションエラー**: 400 Bad Requestを返却
- **検索結果が0件**: 空の配列を返却（エラーではない）
- **Vectorize検索エラー**: 500 Internal Server Errorを返却、ログに記録
- **AI Workers呼び出しエラー**: 500 Internal Server Errorを返却、ログに記録
- **タイムアウト**: 504 Gateway Timeoutを返却

**エラーレスポンス形式**:
```typescript
{
  error: ErrorType;
  message: string;
  details?: unknown;
}
```

### 3.2 Data Collection Worker

#### 3.2.1 設定ファイル

**設定ファイル形式** (`config/calendars.json`):
```json
{
  "calendars": [
    {
      "id": "2015-01",
      "url": "https://qiita.com/advent-calendar/2015/kuso-app",
      "year": 2015,
      "autoUpdate": false
    },
    {
      "id": "2015-02",
      "url": "https://qiita.com/advent-calendar/2015/kuso-app2",
      "year": 2015,
      "autoUpdate": false
    },
    // ... 自動更新対象外のカレンダー
    {
      "id": "2025-01",
      "url": "https://qiita.com/advent-calendar/2025/kuso-app",
      "year": 2025,
      "autoUpdate": true
    }
  ]
}
```

**プロパティ説明**:
- `autoUpdate`: `true`の場合、Cron Triggerで日次更新を行う。`false`の場合は初期データ取得時のみ処理する。

**設定ファイルの管理**:
- リポジトリに含める（バージョン管理）

#### 3.2.2 トリガー
- **初期データ取得**: 手動実行または初期セットアップスクリプト（初回リリース時のみ）
- **日次更新**: Cloudflare Cron Triggers（1日1回、深夜 JST 3:00に実行）

#### 3.2.3 Qiita APIの使用方法
- **エンドポイント**: `/api/v2/advent_calendars/{calendar_id}/items`
- **カレンダーID**: 設定ファイルから取得
- **認証**: 不要（公開API）
- **レート制限**: 1時間あたり60リクエスト（認証なしの場合）
- **ページネーション**: ページごとに最大100件、全ページを取得

#### 3.2.4 初期データ取得処理（初回リリース時のみ）

```typescript
// 初期データ取得用のスクリプト
async function initializeData(env: Env) {
  // 1. 設定ファイルを読み込み
  const config = await loadCalendarConfig();
  
  // 2. 自動更新対象外のカレンダーを全件取得（autoUpdate: false）
  const pastCalendars = config.calendars.filter(c => !c.autoUpdate);
  
  for (const calendar of pastCalendars) {
    // 2-1. カレンダーIDをURLから抽出
    const calendarId = extractCalendarId(calendar.url);
    
    // 2-2. Qiita APIで記事を取得（全ページ）
    const articles = await fetchAllQiitaArticles(calendarId);
    
    // 2-3. 各記事を処理
    for (const article of articles) {
      await processArticle(article, env);
    }
    
    // レート制限を遵守（リクエスト間に間隔を設ける）
    await sleep(60000); // 60秒待機
  }
}

async function processArticle(article: Article, env: Env) {
  // Embedding化（タイトル + タグ + 本文）
  const tagsText = article.tags.map(t => t.name).join(' ');
  const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: `${article.title}\n${tagsText}\n${article.body}`
  });
  // 記事本文はここで破棄され、ベクトルのみが保存される
  
  // Vectorizeに保存
  await env.VECTORIZE_INDEX.insert([{
    id: article.id,
    values: embedding.data[0],
    metadata: {
      title: article.title,
      url: article.url,
      tags: article.tags.map(t => t.name),
      createdAt: article.created_at,
      author: article.user.id,
      likesCount: article.likes_count
    }
  }]);
}
```

#### 3.2.5 日次更新処理（autoUpdate: trueのカレンダーのみ）

```typescript
// 日次更新用のWorker
export default {
  async scheduled(event, env, ctx) {
    // 1. 設定ファイルを読み込み
    const config = await loadCalendarConfig();
    
    // 2. 自動更新対象のカレンダーのみ取得（autoUpdate: true）
    const autoUpdateCalendars = config.calendars.filter(c => c.autoUpdate);
    
    for (const calendar of autoUpdateCalendars) {
    
    for (const calendar of latestCalendars) {
      // 2-1. カレンダーIDをURLから抽出
      const calendarId = extractCalendarId(calendar.url);
      
      // 2-2. 既存の記事IDを取得（Vectorizeから）
      const existingIds = await getExistingArticleIds(env.VECTORIZE_INDEX);
      
      // 2-3. Qiita APIで記事を取得（全ページ）
      const articles = await fetchAllQiitaArticles(calendarId);
      
      // 2-4. 新規記事のみ処理
      for (const article of articles) {
        if (existingIds.includes(article.id)) {
          continue; // 既存記事はスキップ
        }
        
        await processArticle(article, env);
      }
    }
  }
};
```

#### 3.2.6 レート制限対応
- Qiita APIのレート制限を遵守（1時間あたり60リクエスト）
- 初期データ取得時: リクエスト間に適切な間隔を設ける（最小60秒間隔）
- 日次更新時: 新規記事のみ処理するため、レート制限に余裕がある
- エラー時のリトライロジックを実装（最大3回、指数バックオフ）
- 429エラー（レート制限超過）の場合は待機してリトライ

#### 3.2.7 カレンダーIDの抽出
```typescript
// URLからカレンダーIDを抽出
// 例: https://qiita.com/advent-calendar/2025/kuso-app
//     → calendar_id: "kuso-app", year: 2025
function extractCalendarId(url: string): string {
  const match = url.match(/advent-calendar\/\d+\/(.+)$/);
  return match ? match[1] : '';
}
```

### 3.3 Explanation API Worker（Phase 2）

#### 3.3.1 エンドポイント
```
POST /api/explain
```

#### 3.3.2 リクエストハンドラー
```typescript
// 疑似コード
app.post('/api/explain', async (c) => {
  const { query, articleIds } = await c.req.json();
  
  // 1. 記事データを取得
  const articles = await getArticlesByIds(articleIds);
  
  // 2. LLMで説明生成
  const explanation = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{
      role: "system",
      content: "あなたはクソアプリの類似度を説明する専門家です。"
    }, {
      role: "user",
      content: `検索クエリ: "${query}"\n\n類似記事:\n${formatArticles(articles)}\n\nなぜこれらの記事が似ているか、簡潔に説明してください。`
    }]
  });
  
  return c.json({ explanation: explanation.response });
});
```

## 4. データモデル

### 4.1 Vectorize Index Schema

**インデックス設定**:
- **名前**: `kusoogle-articles`
- **次元数**: 768（`@cf/baai/bge-base-en-v1.5`の次元数）
- **メタデータサイズ制限**: 現在の設計（タイトル、URL、タグ、投稿日時、著者、いいね数）は制限内と判断

```typescript
interface VectorizeArticle {
  id: string;                    // 記事ID（Qiita記事ID）
  values: number[];              // Embeddingベクトル（768次元）
  // 記事本文はEmbedding生成にのみ使用し、保存しない（Qiita利用規約遵守のため）
  metadata: {
    title: string;               // 記事タイトル
    url: string;                 // 記事URL
    // body: 保存しない（Embedding生成にのみ一時的に使用）
    tags: string[];              // タグ（文字列配列）
    createdAt: string;           // 投稿日時（ISO 8601）
    author: string;              // 投稿者ID
    likesCount: number;          // いいね数
  };
}
```

**インデックスの作成方法**:
```bash
# Wrangler CLIで作成
wrangler vectorize create kusoogle-articles --dimensions=768 --metric=cosine
```

### 4.2 検索結果スキーマ

```typescript
interface SearchResult {
  id: string;
  title: string;
  url: string;
  similarity: number;            // 類似度スコア（0-1、コサイン類似度）
  // summary: 削除（記事本文の要約は表示しない - Qiita利用規約遵守のため）
  tags: string[];
  createdAt: string;
  author: string;
  likesCount: number;
}
```

**検索結果の並び替え**:
- 類似度スコアの降順（高い順）
- 同類似度の場合は投稿日時の降順（新しい順）
- 類似度スコアが0.3未満の記事は除外（閾値は調整可能）

### 4.3 APIリクエスト/レスポンス

#### 4.3.1 Search API

**リクエスト**:
```typescript
interface SearchRequest {
  query: string;  // 検索クエリ（必須）
}
```

**レスポンス**:
```typescript
interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string;
}
```

**エラーレスポンス**:
```typescript
interface ErrorResponse {
  error: string;
  message: string;
}
```

#### 4.3.2 Explanation API（Phase 2）

**リクエスト**:
```typescript
interface ExplainRequest {
  query: string;
  articleIds: string[];  // 説明対象の記事IDリスト
}
```

**レスポンス**:
```typescript
interface ExplainResponse {
  explanation: string;
  query: string;
}
```

## 5. 型定義

### 5.1 共有型定義（packages/shared/types）

```typescript
// article.ts
export interface Article {
  id: string;
  title: string;
  url: string;
  // body: 削除（記事本文は保存しない）
  tags: string[];
  createdAt: string;
  author: string;
  likesCount: number;
}

// search.ts
export interface SearchResult extends Article {
  similarity: number;
  // summary: 削除（記事本文の要約は表示しない）
}

// api.ts
export interface SearchRequest {
  query: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string;
}
```

## 6. ユーティリティ関数

### 6.1 テキスト処理

```typescript
// 日付フォーマット
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP');
}

// タグをテキストに変換（Embedding生成用）
export function formatTagsForEmbedding(tags: string[]): string {
  return tags.join(' ');
}
```

### 6.2 バリデーション

```typescript
export function validateSearchQuery(query: string): boolean {
  // 1文字以上500文字以下
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return false;
  }
  return true;
}

// 特殊文字のサニタイズ（XSS対策）
export function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>]/g, '')  // HTMLタグを除去
    .trim();
}
```

## 7. エラーハンドリング

### 7.1 エラー種別

```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  VECTORIZE_ERROR = 'VECTORIZE_ERROR',
  AI_ERROR = 'AI_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### 7.2 エラーレスポンス

```typescript
interface ErrorResponse {
  error: ErrorType;
  message: string;
  details?: unknown;
}
```

## 8. テスト戦略

### 8.1 テストランナー
- **Bunの組み込みテストランナー**を使用
- Jest/Vitestの代替として、高速なテスト実行を実現
- TypeScriptを直接実行可能

### 8.2 テスト方針
- **テストカバレッジ**: 主要機能のみをテスト（カバレッジ目標は設定しない）
- **テスト対象**:
  - ユーティリティ関数（テキスト処理、バリデーション）
  - バリデーション関数
  - 主要なAPIエンドポイント（Search API）
  - データ収集Workerの主要処理

### 8.3 テスト実装
- BunのテストAPIを使用
- Cloudflare Workersのローカルテスト環境を活用
- E2Eテストは将来実装（現時点では不要）

## 9. 開発環境

### 9.1 必要なツール
- **Bun 1.0+**（パッケージマネージャー、ランタイム、ビルドツール、テストランナーを統合）
- **Wrangler CLI**（Cloudflare Workers開発用）

### 9.2 Bunの利点
- **高速なパッケージインストール**: npm/pnpmより数倍高速
- **高速なビルド**: TypeScriptのトランスパイルが高速
- **組み込みテストランナー**: 追加のテストフレームワーク不要
- **Node.js互換**: 既存のNode.jsエコシステムと互換性あり

### 9.3 環境変数

**開発環境** (`.env.local`):
```bash
# Cloudflare Workers
VECTORIZE_INDEX_NAME=kusoogle-articles
SEARCH_API_URL=http://localhost:8787  # ローカル開発用
QIITA_API_TOKEN=  # 認証不要（公開API）

# Next.js
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:8787
```

**本番環境** (Cloudflare Dashboard):
```bash
# Cloudflare Workers
VECTORIZE_INDEX_NAME=kusoogle-articles
SEARCH_API_URL=https://search-api.kusoogle.workers.dev
QIITA_API_TOKEN=  # 認証不要（公開API）

# Next.js (Cloudflare Pages)
NEXT_PUBLIC_SEARCH_API_URL=https://search-api.kusoogle.workers.dev
```

**環境変数の設定方法**:
- 開発環境: `.env.local`ファイルに記述
- 本番環境: Cloudflare Dashboardの「Workers & Pages」→「Settings」→「Variables」で設定

### 9.4 開発コマンド

```bash
# パッケージインストール
bun install

# Vectorizeインデックスの作成（初回のみ）
wrangler vectorize create kusoogle-articles --dimensions=768 --metric=cosine

# フロントエンド開発
bun --bun dev                    # Next.js開発サーバー（Bunで起動）
# または
bun run dev                      # package.jsonのスクリプト実行

# Workers開発
bun run dev:workers              # Wrangler dev
bun run dev:search                # Search API Workerのみ
bun run dev:data-collection       # Data Collection Workerのみ

# ビルド
bun run build                    # 全プロジェクトをビルド

# テスト
bun test                         # 全テストを実行
bun test apps/frontend           # 特定パッケージのテスト

# デプロイ
# 1. Vectorizeインデックスの確認（既に作成済み）
# 2. Workersのデプロイ
bun run deploy:workers           # 全Workersをデプロイ
# 3. フロントエンドのデプロイ
bun run deploy:frontend          # Cloudflare Pagesにデプロイ
```

### 9.5 package.jsonの例

```json
{
  "name": "kusoogle",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun --bun --cwd apps/frontend dev",
    "dev:workers": "bun run --filter './apps/workers/*' dev",
    "build": "bun run --filter './apps/*' build",
    "test": "bun test",
    "deploy": "bun run deploy:frontend && bun run deploy:workers"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

## 10. 参考資料

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [Bun Test Documentation](https://bun.sh/docs/test)

