# Cloudflare Workers 初学者向けガイド

## wrangler.tomlとは？

`wrangler.toml`は、Cloudflare Workersの**設定ファイル**です。このファイルに書くことで、Workerの動作を制御できます。

### なぜ必要？

- **デプロイ設定**: どのWorkerをデプロイするか
- **バインディング**: VectorizeやAI Workersなどの外部サービスとの接続
- **環境変数**: Workerで使う設定値
- **Cron Trigger**: 定期実行のスケジュール

---

## 各設定項目の解説

### 1. 基本設定

```toml
name = "kusoogle-data-collection"
main = "src/index.ts"
compatibility_date = "2024-01-01"
```

- **`name`**: Workerの名前。Cloudflare Dashboardで表示される名前
- **`main`**: エントリーポイント（メインのコードファイル）
- **`compatibility_date`**: WorkersのAPIバージョン。新しい機能を使う場合は新しい日付を指定

### 2. Vectorizeバインディング

```toml
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "kusoogle-articles"
```

**Vectorizeとは？**
- Cloudflareが提供するベクトルデータベース
- 類似度検索ができる

**バインディングとは？**
- Workerコード内で外部サービスを使えるようにする仕組み
- `env.VECTORIZE_INDEX`でアクセスできるようになる

**設定の意味：**
- `binding`: コード内で使う変数名（`env.VECTORIZE_INDEX`）
- `index_name`: 実際のVectorizeインデックスの名前

**コードでの使用例：**
```typescript
// env.VECTORIZE_INDEXでVectorizeにアクセスできる
await env.VECTORIZE_INDEX.insert([...]);
```

### 3. AI Workersバインディング

```toml
[[ai]]
binding = "AI"
```

**AI Workersとは？**
- Cloudflareが提供するAI/MLサービス
- Embedding生成やLLMが使える

**設定の意味：**
- `binding`: コード内で使う変数名（`env.AI`）

**コードでの使用例：**
```typescript
// env.AIでAI Workersにアクセスできる
const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: 'Hello, world!'
});
```

### 4. Cron Trigger（定期実行）

```toml
[triggers]
crons = ["0 18 * * *"]
```

**Cron Triggerとは？**
- 指定した時間に自動でWorkerを実行する機能
- 例：毎日決まった時間にデータを取得

**Cron式の読み方：**
```
"0 18 * * *"
 │  │ │ │ │
 │  │ │ │ └─ 曜日（0-7、0と7は日曜日）
 │  │ │ └─── 月（1-12）
 │  │ └───── 日（1-31）
 │  └─────── 時（0-23、UTC時刻）
 └───────── 分（0-59）
```

**この例の意味：**
- `"0 18 * * *"` = 毎日UTC 18:00（日本時間 3:00）に実行

**他の例：**
- `"0 0 * * *"` = 毎日UTC 0:00（日本時間 9:00）
- `"0 */6 * * *"` = 6時間ごと
- `"0 0 * * 1"` = 毎週月曜日のUTC 0:00

### 5. 環境変数

```toml
[vars]
ENVIRONMENT = "development"
```

**環境変数とは？**
- Workerコード内で使える設定値
- 開発環境と本番環境で異なる値を設定できる

**コードでの使用例：**
```typescript
if (env.ENVIRONMENT === 'development') {
  console.log('開発環境です');
}
```

**本番環境での設定：**
- Cloudflare Dashboardの「Workers & Pages」→「Settings」→「Variables」で設定
- シークレット（パスワードなど）は「Secrets」で設定

---

## よくある質問

### Q: バインディングは何個でも設定できる？
A: はい。Vectorize、AI Workers、KV、D1など、複数のバインディングを設定できます。

### Q: Cron Triggerは複数設定できる？
A: はい。配列で複数のスケジュールを設定できます。
```toml
crons = ["0 0 * * *", "0 12 * * *"]  # 1日2回実行
```

### Q: 環境変数とシークレットの違いは？
A: 
- **環境変数（vars）**: 設定ファイルに書ける（公開されても問題ない値）
- **シークレット（secrets）**: パスワードやAPIキーなど、機密情報（設定ファイルには書かない）

### Q: ローカル開発時もこの設定は必要？
A: はい。`wrangler dev`コマンドでローカル開発する際も、この設定ファイルが使われます。

---

## まとめ

`wrangler.toml`は、Cloudflare Workersの「設計図」のようなものです。

- **何を**（Worker名、メインファイル）
- **どこに接続するか**（バインディング）
- **いつ実行するか**（Cron Trigger）
- **どんな設定を使うか**（環境変数）

これらをすべてこのファイルで管理します。

