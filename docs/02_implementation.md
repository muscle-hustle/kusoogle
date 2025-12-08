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
- Server Actionを使用（Next.js 16 / App Router）
- Cloudflare WorkersのSearch APIを呼び出す
- リアルタイム検索は実装しない（コスト削減）
- フォーム送信で検索実行
- 入力検証: 1文字以上500文字以下、特殊文字のサニタイズ

**Props**:
- `onSearch`: 検索クエリを受け取り、検索を実行する関数

**実装**:
- Server Actionを使用してCloudflare WorkersのSearch APIを呼び出す

#### 2.2.2 SearchResults
**役割**: 検索結果を一覧表示

**実装方針**:
- React Server Componentsで実装
- スケルトンUIでローディング状態を表示
- 無限スクロールは実装しない（topK=10で固定）

**Props**:
- `results`: 検索結果の配列
- `isLoading`: ローディング状態

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
- `article`: 表示する記事データ

#### 2.2.4 ExplanationCard（Phase 2）
**役割**: 類似アプリの説明を表示

**実装方針**:
- 検索結果表示後に非同期で取得
- スケルトンUIでローディング状態を表示

**Props**:
- `query`: 検索クエリ
- `articleIds`: 説明対象の記事ID配列

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

**処理フロー**:
1. リクエストボディからクエリを取得
2. AI Workersを使用してクエリをEmbedding化（`@cf/baai/bge-base-en-v1.5`）
3. Vectorizeで類似度検索（topK=10、メタデータを返却）
4. 結果を整形（記事本文の要約は含めない）
5. JSON形式でレスポンスを返却

#### 3.1.4 エラーハンドリング

**エラーケースと処理**:
- **バリデーションエラー**: 400 Bad Requestを返却
- **検索結果が0件**: 空の配列を返却（エラーではない）
- **Vectorize検索エラー**: 500 Internal Server Errorを返却、ログに記録
- **AI Workers呼び出しエラー**: 500 Internal Server Errorを返却、ログに記録
- **タイムアウト**: 504 Gateway Timeoutを返却

**エラーレスポンス形式**:
- `error`: エラータイプ
- `message`: エラーメッセージ
- `details`: 詳細情報（オプショナル）

### 3.2 Data Collection Worker

#### 3.2.1 設定ファイル

**設定ファイル形式** (`config/calendars.json`):
- `calendars`: カレンダー設定の配列
  - `id`: カレンダーID
  - `url`: カレンダーURL
  - `year`: 年
  - `autoUpdate`: 自動更新フラグ（`true`の場合、Cron Triggerで日次更新を行う）

**プロパティ説明**:
- `autoUpdate`: `true`の場合、Cron Triggerで日次更新を行う。`false`の場合は初期データ取得時のみ処理する。

**設定ファイルの管理**:
- リポジトリに含める（バージョン管理）

#### 3.2.2 トリガー
- **初期データ取得**: 手動実行または初期セットアップスクリプト（初回リリース時のみ）
- **日次更新**: Cloudflare Cron Triggers（1日1回、深夜 JST 3:00に実行）

#### 3.2.3 Qiita APIの使用方法

**注意**: Qiita APIには`advent_calendars`エンドポイントが存在しません。
そのため、カレンダーページのHTMLを解析して記事IDを抽出します。

- **カレンダーページURL**: 設定ファイルから取得（例: `https://qiita.com/advent-calendar/2025/kuso-app`）
- **取得方法**:
  1. カレンダーページのHTMLを取得
  2. HTMLから記事URL（`/items/{article_id}`）を正規表現で抽出
  3. 各記事IDに対してQiita APIで詳細を取得（`/api/v2/items/{article_id}`）
- **認証**: オプショナル（アクセストークンを使用可能）
  - **認証なし**: 1時間あたり60リクエスト
  - **認証あり**: 1時間あたり1000リクエスト（推奨）
- **アクセストークンの設定**: Cloudflare Workersのシークレットとして設定
  - 設定方法: `wrangler secret put QIITA_ACCESS_TOKEN`
- **負荷**: 初期登録時と1日1回の更新時のみ使用されるため、サーバーへの負荷は最小限

**取得フロー**:
```
カレンダーページHTML取得 → 記事ID抽出 → 各記事の詳細をQiita APIで取得
```

#### 3.2.4 初期データ取得処理（初回リリース時のみ）

**処理フロー**:
1. 設定ファイルを読み込み
2. 全てのカレンダー（autoUpdate: true/false問わず）を処理
3. 各カレンダーについて:
   - カレンダーページのHTMLから記事IDを抽出
   - Qiita APIで各記事の詳細を取得
   - 各記事を処理（Embedding化、Vectorizeに保存）
4. レート制限を遵守するため、リクエスト間に適切な間隔を設ける

**記事処理**:
- タイトル、タグ、本文を結合してEmbedding化（`@cf/baai/bge-base-en-v1.5`）
- 記事本文はEmbedding生成後に破棄され、ベクトルのみが保存される
- Vectorizeに保存するメタデータ: タイトル、URL、タグ、作成日時、更新日時、著者、いいね数

#### 3.2.5 日次更新処理（autoUpdate: trueのカレンダーのみ）

**処理フロー**:
1. 設定ファイルを読み込み
2. 自動更新対象のカレンダー（autoUpdate: true）のみを処理
3. 各カレンダーについて:
   - カレンダーページのHTMLから記事IDを抽出
   - 既存の記事データを取得（Vectorizeから）
   - Qiita APIで各記事の詳細を取得
   - 新規記事または更新された記事を処理:
     - 新規記事: 処理してVectorizeに保存
     - 既存記事: 更新日時を比較し、新しい場合は更新
          // 既存記事: 更新日時を比較して、新しい場合は更新
          const existingUpdatedAt = existing.metadata.updatedAt;
          if (new Date(article.updated_at) > new Date(existingUpdatedAt)) {
            await processArticle(article, env);
          }
        }
      }
    }
  }
};
```

#### 3.2.6 レート制限対応
- Qiita APIのレート制限を遵守
  - **認証なし**: 制限あり（デフォルト）
  - **認証あり**: レート制限が緩和される（推奨）
- アクセストークンが設定されている場合は自動的に認証付きリクエストを使用
- 初期データ取得時: リクエスト間に適切な間隔を設ける（認証状態に応じて自動調整）
- 日次更新時: 新規記事のみ処理するため、レート制限に余裕がある
- エラー時のリトライロジックを実装（最大3回、指数バックオフ）
- 429エラー（レート制限超過）の場合は待機してリトライ

#### 3.2.7 カレンダーIDの抽出

**処理**:
- URLからカレンダーIDを抽出（正規表現を使用）
- 例: `https://qiita.com/advent-calendar/2025/kuso-app` → `kuso-app`

### 3.3 Explanation API Worker（Phase 2）

#### 3.3.1 エンドポイント
```
POST /api/explain
```

#### 3.3.2 リクエストハンドラー

**処理フロー**:
1. リクエストボディからクエリと記事IDリストを取得
2. 記事IDリストから記事データを取得
3. LLMで説明生成
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

**データ構造**:
- `id`: 記事ID（Qiita記事ID）
- `values`: Embeddingベクトル（768次元）
- `metadata`: メタデータ
  - `title`: 記事タイトル
  - `url`: 記事URL
  - `tags`: タグ（文字列配列）
  - `createdAt`: 投稿日時（ISO 8601）
  - `updatedAt`: 更新日時（ISO 8601）- cronで取得した記事の更新日時と比較してデータ更新を判定
  - `author`: 投稿者ID
  - `likesCount`: いいね数

**注意**: 記事本文はEmbedding生成にのみ使用し、保存しない（Qiita利用規約遵守のため）

**インデックスの作成方法**:
- Wrangler CLIで作成（`wrangler vectorize create`コマンドを使用）
- 次元数: 768、メトリック: cosine

### 4.2 検索結果スキーマ

**データ構造**:
- `id`: 記事ID
- `title`: 記事タイトル
- `url`: 記事URL
- `similarity`: 類似度スコア（0-1、コサイン類似度）
- `tags`: タグ
- `createdAt`: 投稿日時
- `author`: 投稿者ID
- `likesCount`: いいね数

**注意**: 記事本文の要約は表示しない（Qiita利用規約遵守のため）

**検索結果の並び替え**:
- 類似度スコアの降順（高い順）
- 同類似度の場合は投稿日時の降順（新しい順）
- 類似度スコアが0.3未満の記事は除外（閾値は調整可能）

### 4.3 APIリクエスト/レスポンス

#### 4.3.1 Search API

**リクエスト**:
- `query`: 検索クエリ（必須）

**レスポンス**:
- `results`: 検索結果の配列
- `query`: 検索クエリ
- `timestamp`: タイムスタンプ

**エラーレスポンス**:
- `error`: エラータイプ
- `message`: エラーメッセージ

#### 4.3.2 Explanation API（Phase 2）

**リクエスト**:
- `query`: 検索クエリ
- `articleIds`: 説明対象の記事IDリスト

**レスポンス**:
- `explanation`: 類似度の説明
- `query`: 検索クエリ

## 5. 型定義

### 5.1 共有型定義（packages/shared/types）

**共有型定義**:
- `Article`: 記事データ（ID、タイトル、URL、タグ、作成日時、更新日時、著者、いいね数）
- `SearchResult`: 検索結果（Articleを継承、類似度スコアを追加）
- `SearchRequest`: 検索リクエスト（クエリ）
- `SearchResponse`: 検索レスポンス（結果配列、クエリ、タイムスタンプ）

**注意**: 記事本文は保存しない（Qiita利用規約遵守のため）

## 6. ユーティリティ関数

### 6.1 テキスト処理

**ユーティリティ関数**:
- `formatDate`: 日付を日本語形式でフォーマット
- `formatTagsForEmbedding`: タグ配列をテキストに変換（Embedding生成用）

### 6.2 バリデーション

**バリデーション関数**:
- `validateSearchQuery`: 検索クエリを検証（1文字以上500文字以下）
- `sanitizeQuery`: 特殊文字をサニタイズ（XSS対策、HTMLタグを除去）

## 7. エラーハンドリング

### 7.1 エラー種別

**エラー種別**:
- `VALIDATION_ERROR`: バリデーションエラー
- `API_ERROR`: APIエラー
- `VECTORIZE_ERROR`: Vectorizeエラー
- `AI_ERROR`: AI Workersエラー
- `UNKNOWN_ERROR`: 不明なエラー

### 7.2 エラーレスポンス

**エラーレスポンス**:
- `error`: エラー種別
- `message`: エラーメッセージ
- `details`: 詳細情報（オプショナル）

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
- `VECTORIZE_INDEX_NAME`: Vectorizeインデックス名
- `SEARCH_API_URL`: ローカル開発用のAPI URL
- `QIITA_ACCESS_TOKEN`: Qiita APIアクセストークン（オプショナル）
- `NEXT_PUBLIC_SEARCH_API_URL`: Next.js用のAPI URL

**本番環境** (Cloudflare Dashboard):
- 環境変数はCloudflare Dashboardで設定
- シークレットは`wrangler secret put`コマンドで設定

**環境変数の設定方法**:
- 開発環境: `.env.local`ファイルに記述
- 本番環境: Cloudflare Dashboardの「Workers & Pages」→「Settings」→「Variables」で設定

### 9.4 Cloudflare Workersのローカル開発

#### 9.4.1 Wrangler CLIのセットアップ

- Wrangler CLIをインストール（グローバルまたはプロジェクトローカル）
- プロジェクトローカルにインストールする場合は`bun add -d wrangler`

#### 9.4.2 ローカル開発の起動方法

**基本的な使い方**:
- 各Workerディレクトリで`wrangler dev`を実行
- または、ルートから`bun run dev:search`、`bun run dev:data-collection`を実行
```

**`wrangler dev`の動作**:
- ローカルサーバーが起動（デフォルト: `http://localhost:8787`）
- ファイル変更を自動検知してリロード（ホットリロード）
- 本番環境と同様の環境で実行される

#### 9.4.3 wrangler.tomlの設定

各Workerディレクトリに`wrangler.toml`を作成し、バインディングと環境変数を設定します。

**Search API Workerの例** (`apps/workers/search/wrangler.toml`):
```toml
name = "kusoogle-search"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Vectorizeバインディング
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "kusoogle-articles"

# AI Workersバインディング
[[ai]]
binding = "AI"

# 環境変数（開発環境用）
[vars]
ENVIRONMENT = "development"
```

**Data Collection Workerの例** (`apps/workers/data-collection/wrangler.toml`):
```toml
name = "kusoogle-data-collection"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Vectorizeバインディング
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "kusoogle-articles"

# AI Workersバインディング
[[ai]]
binding = "AI"

# Cron Triggerの設定
[triggers]
crons = ["0 18 * * *"]  # JST 3:00（UTC 18:00）

# 環境変数
[vars]
ENVIRONMENT = "development"
```

#### 9.4.4 ローカル開発時の注意点

1. **バインディングの扱い**:
   - Vectorize、AI Workersなどのバインディングは、`wrangler.toml`で設定
   - ローカル開発時も実際のCloudflareリソースに接続される（認証が必要）
   - 初回実行時に`wrangler login`で認証が必要

2. **環境変数**:
   - `wrangler.toml`の`[vars]`セクションで設定
   - または、`.dev.vars`ファイルで設定（`.gitignore`に含める）

3. **Cron Trigger**:
   - ローカル開発時はCron Triggerは実行されない
   - 手動でトリガーする場合は、`wrangler dev --test-scheduled`を使用

4. **Vectorizeインデックス**:
   - ローカル開発時も実際のVectorizeインデックスを使用
   - 開発用のインデックスを別途作成することも可能

#### 9.4.5 開発コマンド

**主要なコマンド**:
- `bun install`: パッケージインストール
- `wrangler login`: Cloudflareにログイン（初回のみ）
- `wrangler vectorize create`: Vectorizeインデックスの作成（初回のみ）
- `bun run dev:frontend`: Next.js開発サーバー起動
- `bun run dev:search`: Search API Worker起動
- `bun run dev:data-collection`: Data Collection Worker起動
- `wrangler dev --port`: 特定のポートで起動
- `wrangler dev --remote`: リモートデバッグ（本番環境のログを確認）
- `bun run build`: 全プロジェクトをビルド
- `bun test`: 全テストを実行
- `bun run deploy:search`: Search API Workerをデプロイ
- `bun run deploy:data-collection`: Data Collection Workerをデプロイ

### 9.5 package.jsonの構成

**主要な設定**:
- `workspaces`: Bun workspacesを使用（`apps/*`、`packages/*`）
- `scripts`: 開発、ビルド、テスト、デプロイ用のスクリプト
- `devDependencies`: 開発依存関係（`@types/bun`など）

## 10. 参考資料

### 10.1 公式ドキュメント

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [Bun Test Documentation](https://bun.sh/docs/test)

### 10.2 プロジェクト内ガイド

- [フロントエンドアーキテクチャ解説](./guides/frontend-architecture-explanation.md)
- [SSR vs CSR vs RSCの違い](./guides/ssr-vs-csr-vs-rsc.md)
- [RSCとAPI Routesの違い](./guides/rsc-vs-api-routes.md)
- [ローカル開発トラブルシューティング](./guides/local-development-troubleshooting.md)
- [検索エラートラブルシューティング](./guides/search-error-troubleshooting.md)
- [Workers初心者ガイド](./guides/workers-beginners-guide.md)

