# クソアプリ検索エンジン「kusoogle」アーキテクチャ仕様書

## 1. システム概要

### 1.1 システムの目的
クソアプリアドベントカレンダーに参加する前に、自分のアイデアと類似したクソアプリが過去に存在しないか確認するための検索エンジンを提供する。

### 1.2 コンセプト
**「用途はクソだが、中身は無駄に高度」**

- ユーザーにとっては単純な検索ツール
- 技術的には意味的類似性を理解する高度なベクトル検索を実装
- 最新のエッジコンピューティング技術を活用

### 1.3 システム構成図

```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│   Cloudflare Pages (Edge)          │
│   Next.js 15 (Frontend)            │
│   - React Server Components         │
│   - Server Actions                  │
│   - Edge Runtime                    │
└────────┬────────────────────────────┘
         │ HTTP/HTTPS
         ▼
┌─────────────────────────────────────┐
│   Cloudflare Workers (Edge)         │
│   - Hono Framework                  │
│   - TypeScript 5.x                   │
│   ┌──────────────────────────────┐  │
│   │  Search API                  │  │
│   │  - クエリのEmbedding化       │  │
│   │  - Vectorize検索             │  │
│   │  - 説明生成（Phase 2）        │  │
│   └──────────────────────────────┘  │
│   ┌──────────────────────────────┐  │
│   │  Data Collection (Cron)      │  │
│   │  - Qiita API呼び出し         │  │
│   │  - 記事のEmbedding化         │  │
│   │  - Vectorizeへの保存         │  │
│   └──────────────────────────────┘  │
└────────┬────────────────────────────┘
         │
    ┌────┴────┬──────────────┬────────────┐
    ▼         ▼              ▼            ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Vectorize│ │AI Workers│ │   KV     │ │  Cron    │
│(Vector  │ │(Embedding│ │(Cache)   │ │(Scheduler)│
│  DB)    │ │  Model)  │ │          │ │          │
└─────────┘ └──────────┘ └──────────┘ └──────────┘
```

## 2. 技術スタック

### 2.1 フロントエンド

#### 2.1.1 コア技術
- **Framework**: Next.js 15+ (App Router)
  - React Server Components（RSC）を活用したサーバーサイドレンダリング
  - Server Actionsによるサーバーサイド処理
  - Edge Runtimeによるエッジでの実行
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x（最新版）
- **Deployment**: Cloudflare Pages（エッジデプロイ）

#### 2.1.2 最新技術要素の採用理由
- **React Server Components**: サーバーサイドでのコンポーネント実行により、初期表示の高速化とバンドルサイズの削減
- **Server Actions**: フォーム送信やデータ更新をサーバーサイドで処理し、APIルートを不要に
- **Edge Runtime**: Cloudflareのエッジネットワークで実行し、低遅延を実現

### 2.2 バックエンド

#### 2.2.1 コア技術
- **Runtime**: Cloudflare Workers
  - V8 Isolatesによる軽量で高速な実行環境
  - グローバルエッジネットワークでの実行
- **Framework**: Hono
  - 軽量で高速なWebフレームワーク
  - TypeScriptファーストの設計
  - Cloudflare Workersに最適化
- **Language**: TypeScript 5.x

#### 2.2.2 最新技術要素の採用理由
- **Hono**: Express.jsなどの古典的なフレームワークより軽量で、エッジ環境に最適
- **Cloudflare Workers**: サーバーレスで自動スケーリング、低コスト
- **Bun**: 開発環境で使用。高速なパッケージ管理、ビルド、テストを実現

### 2.3 データストレージ

#### 2.3.1 ベクトルデータベース
- **Cloudflare Vectorize**
  - エッジベースのベクトルDB
  - 類似度検索を高速に実行
  - 無料枠あり

#### 2.3.2 キーバリューストア
- **Cloudflare KV**（Phase 2以降）
  - エッジベースのKVS
  - 低レイテンシーでのデータアクセス
  - 無料枠あり

### 2.4 AI/ML

#### 2.4.1 Embedding生成
- **Cloudflare AI Workers**
  - モデル: `@cf/baai/bge-base-en-v1.5`（多言語対応、日本語も処理可能）
  - ベクトル次元数: 768次元
  - エッジでの実行により低遅延
  - 無料枠あり（1日あたりのリクエスト数に制限あり）

#### 2.4.2 LLM（Phase 2）
- **Cloudflare AI Workers**
  - モデル: `@cf/meta/llama-3.1-8b-instruct`
  - エッジでの実行により低遅延
  - 無料枠あり

### 2.5 外部API
- **Qiita API v2**
  - RESTful API
  - エンドポイント: `/api/v2/advent_calendars/{calendar_id}/items`
  - カレンダーID: `kuso-app`（クソアプリアドベントカレンダー2025）
  - 認証: 不要（公開API）
  - レート制限: 1時間あたり60リクエスト（認証なしの場合）

### 2.6 インフラ

#### 2.6.1 CDN/Edge
- **Cloudflare**
  - グローバルエッジネットワーク
  - DDoS保護
  - 自動SSL/TLS

#### 2.6.2 スケジューラー
- **Cloudflare Cron Triggers**
  - 定期的なデータ収集の実行
  - エッジでの実行

## 3. アーキテクチャパターン

### 3.1 エッジファーストアーキテクチャ
- すべてのコンポーネントをエッジで実行
- ユーザーに最も近い場所で処理を実行し、低遅延を実現
- グローバルに分散したインフラにより、高可用性を確保

### 3.2 サーバーレスアーキテクチャ
- インフラ管理不要
- 自動スケーリング
- 使用量ベースの課金（無料枠あり）

### 3.3 マイクロサービス風アーキテクチャ
- Search API WorkerとData Collection Workerを分離
- 各Workerが独立してスケール可能
- 障害の影響範囲を局所化

## 4. データフロー

### 4.1 データ収集フロー

#### 4.1.1 初期データ取得（初回リリース時のみ）
```
手動実行または初期セットアップスクリプト
    ↓
Data Collection Worker（初期取得モード）
    ↓
設定ファイルから対象カレンダーURLを読み込み
    ↓
過去年分のカレンダーを全件取得
    ↓
Qiita API呼び出し（レート制限遵守）
    ↓
記事データ取得（タイトル、タグ、本文、メタデータ）
    ↓
AI Workers (タイトル + タグ + 本文をEmbedding化)
    ↓
記事本文を破棄（一時的な処理にのみ使用）
    ↓
Vectorizeに保存（ベクトルのみ保存、記事本文は保存しない）
```

#### 4.1.2 日次データ更新（autoUpdate: trueのカレンダーのみ）
```
Cloudflare Cron Triggers (1日1回)
    ↓
Data Collection Worker（日次更新モード）
    ↓
設定ファイルから自動更新対象のカレンダーURLを読み込み（autoUpdate: true）
    ↓
既存記事IDを取得（Vectorizeから）
    ↓
Qiita API呼び出し（レート制限遵守）
    ↓
最新記事のみ取得（新規記事のみ）
    ↓
AI Workers (タイトル + タグ + 本文をEmbedding化)
    ↓
記事本文を破棄（一時的な処理にのみ使用）
    ↓
Vectorizeに保存（ベクトルのみ保存、記事本文は保存しない）
```

### 4.2 検索フロー（Phase 1）

```
ユーザー入力（ブラウザ）
    ↓
Next.js Server Action / API Route
    ↓
Search API Worker（エッジ）
    ↓
AI Workers (クエリのEmbedding化)
    ↓
Vectorize検索（topK: 10）
    ↓
結果を整形
    ↓
フロントエンドに返却
    ↓
React Server Componentsで表示
```

### 4.3 検索フロー（Phase 2: 説明機能追加）

```
ユーザー入力
    ↓
Search API Worker
    ↓
AI Workers (クエリのEmbedding化)
    ↓
Vectorize検索
    ↓
結果を即座に返却（フロントエンドに表示）
    ↓
[並行処理]
Explanation API Worker
    ↓
LLMで説明生成
    ↓
説明を返却（フロントエンドに追加表示）
```

## 5. セキュリティ

### 5.1 API認証・認可
- 現時点では認証不要（公開API）
- 将来的にレート制限を実装する可能性あり
- CORS設定を適切に管理

### 5.2 レート制限
- Qiita APIのレート制限を遵守
- データ収集Workerでは適切な間隔でリクエスト
- 必要に応じてCloudflare Workersのレート制限機能を活用

### 5.3 データ保護
- 取得した記事データはQiitaの利用規約の範囲内で使用
- 記事本文はEmbedding生成にのみ一時的に使用し、保存・表示しない（著作権保護のため）
- ベクトル（数値配列）のみを保存し、記事本文自体は保存しない
- 個人情報は保存しない
- HTTPS通信を強制

### 5.4 入力検証
- ユーザー入力のサニタイズ
- 型安全性をTypeScriptで確保

### 5.5 利用規約遵守
- **非商用プロジェクト**: 広告や収益化は行わない
- **記事本文の扱い**: 記事本文はEmbedding生成にのみ一時的に使用し、保存・表示はしない
- **ベクトルのみ保存**: 記事本文自体は保存せず、ベクトル化された数値配列のみを保存
- **出典表示**: 検索結果に「出典: Qiita」を表示
- **リンク提供**: 各記事へのリンクを明確に表示

## 6. パフォーマンス最適化

### 6.1 エッジコンピューティング
- すべての処理をエッジで実行し、レイテンシーを最小化
- ユーザーに最も近い場所で処理を実行

### 6.2 キャッシュ戦略
- Qiita APIのレスポンスを適切にキャッシュ
- Cloudflare KVでメタデータをキャッシュ（Phase 2）
- 検索結果の説明はキャッシュしない（Phase 2の要件）

### 6.3 ベクトル検索の最適化
- Vectorizeのインデックスを適切に管理
- 検索結果数はtopK=10をデフォルトとする
- 類似度スコアが0.3未満の記事は除外（閾値は調整可能）
- エッジでの実行により低遅延を実現
- コサイン類似度を使用（Vectorizeのデフォルト）

### 6.4 フロントエンド最適化
- React Server Componentsによる初期表示の高速化
- 検索結果の段階的表示（Phase 2）
- スケルトンUIでローディング状態を表示
- Edge Runtimeによるエッジでの実行

## 7. デプロイメント

### 7.1 フロントエンド
- **Cloudflare Pages**: `wrangler pages deploy`
- エッジでの自動デプロイ
- プレビューデプロイメント対応

### 7.2 バックエンド
- **Cloudflare Workers**: `wrangler deploy`
- エッジでの自動デプロイ
- 複数のWorkerを独立してデプロイ可能

### 7.3 環境変数管理
- Cloudflare Dashboardで管理
- 本番環境と開発環境を分離
- シークレット管理機能を活用

## 8. モニタリング・ログ

### 8.1 ログ
- Cloudflare Workersのログを確認
- Cloudflare Dashboardでリアルタイムログを確認
- Cloudflareのデフォルト設定を使用（ログレベル、保存期間はデフォルトに従う）
- エラー発生時の通知（将来実装）

### 8.2 メトリクス
- 検索リクエスト数
- エラー率
- レスポンスタイム
- Cloudflare Analyticsで可視化

### 8.3 アラート
- エラー率の閾値超過
- レスポンスタイムの閾値超過
- Cloudflareのアラート機能を活用（将来実装）

## 9. スケーラビリティ

### 9.1 水平スケーリング
- Cloudflare Workersは自動スケーリング
- Vectorizeも自動スケーリング対応
- エッジネットワークにより、地理的なスケーリングも自動

### 9.2 垂直スケーリング
- 不要（サーバーレスアーキテクチャ）

### 9.3 コスト最適化
- 無料枠を最大限活用
- 使用量ベースの課金により、低トラフィック時は低コスト
- エッジでの実行により、データ転送コストを削減

### 9.4 データの永続化
- **Vectorizeのデータ保持**: 永続的（データは削除されない）
- **バックアップ戦略**: 不要（データが失われた場合は再取得で対応可能）

## 10. 今後の拡張性

### 10.1 機能拡張
- 検索結果のフィルタリング
- ソート機能
- 検索履歴
- お気に入り機能

### 10.2 技術的拡張
- 他のベクトルDBとの統合検討
- より高度なEmbeddingモデルの採用
- マルチモーダル検索（画像など）の検討

### 10.3 データソース拡張
- 他のアドベントカレンダーとの統合
- 他のプラットフォーム（GitHub、Zennなど）との統合

## 11. 技術選定の理由

### 11.1 最新技術を選んだ理由
- **Next.js 15**: 最新のReact Server Components、Server Actionsを活用
- **Hono**: Express.jsより軽量で、エッジ環境に最適
- **TypeScript 5.x**: 最新の型システム機能を活用
- **Tailwind CSS 4.x**: 最新の機能とパフォーマンス改善

### 11.2 エッジファーストを選んだ理由
- 低遅延の実現
- グローバルな可用性
- コスト効率
- 運用負荷の削減

### 11.3 Bunを選んだ理由
- **高速な開発体験**: パッケージインストール、ビルド、テストが高速
- **オールインワン**: ランタイム、パッケージマネージャー、ビルドツール、テストランナーを統合
- **Node.js互換**: 既存のエコシステムと互換性を維持
- **最新技術**: 2023年に1.0リリース、継続的に機能強化されている

## 12. 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [Cloudflare AI Workers Documentation](https://developers.cloudflare.com/workers-ai/)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev/)
- [Qiita API v2 Documentation](https://qiita.com/api/v2/docs)
