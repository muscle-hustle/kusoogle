# Vectorizeデータの確認方法

Vectorizeにデータが正しく格納されたことを確認する方法を説明します。

## 方法1: Search APIで検索して確認（推奨）

最も簡単で確実な方法です。Search API Workerを使って検索を実行し、結果が返ってくるか確認します。

### 手順

1. **Search API Workerが起動していることを確認**
   ```bash
   curl http://localhost:8787/health
   ```
   レスポンス: `{"status":"ok"}` が返ってくれば正常

2. **検索APIで検索を実行**
   ```bash
   curl -X POST http://localhost:8787/api/search \
     -H "Content-Type: application/json" \
     -d '{"query":"タスク管理"}'
   ```

3. **レスポンスを確認**
   - 結果が返ってくれば、データが格納されています
   - `results`配列に記事が含まれていれば成功
   - 空の配列が返ってくる場合は、データがまだ格納されていないか、検索クエリに一致する記事がない可能性があります

### レスポンス例

```json
{
  "results": [
    {
      "id": "e303cf655373992f61f4",
      "title": "記事タイトル",
      "url": "https://qiita.com/...",
      "tags": ["タスク管理", "アプリ"],
      "similarity": 0.85,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "author": "user_id",
      "likesCount": 10
    }
  ],
  "query": "タスク管理",
  "timestamp": "2025-12-07T06:30:00.000Z"
}
```

## 方法2: フロントエンドで確認

フロントエンドアプリケーションで検索を実行して確認します。

### 手順

1. **フロントエンドを起動**
   ```bash
   bun run dev:frontend
   ```

2. **ブラウザでアクセス**
   - `http://localhost:3000` を開く

3. **検索を実行**
   - 検索フォームにクエリを入力（例: "タスク管理"）
   - 検索ボタンをクリック

4. **結果を確認**
   - 検索結果が表示されれば、データが格納されています
   - 結果が表示されない場合は、データがまだ格納されていないか、検索クエリに一致する記事がない可能性があります

## 方法3: Cloudflare Dashboardで確認

Cloudflare DashboardからVectorizeインデックスの情報を確認できます。

### 手順

1. **Cloudflare Dashboardにログイン**
   - https://dash.cloudflare.com/ にアクセス

2. **Vectorizeインデックスを確認**
   - 「Workers & Pages」→「Vectorize」を選択
   - `kusoogle-articles`インデックスを選択
   - インデックスの情報（次元数、メトリック、データ数など）を確認

3. **データ数の確認**
   - インデックスの詳細ページで、格納されているデータ数を確認できます

## 方法4: ログで確認

Data Collection Workerのログを確認して、データが正しく保存されたか確認します。

### 確認ポイント

- `記事 X/Y の処理完了` というログが表示されているか
- エラーログが表示されていないか
- 各記事の処理が成功しているか

### ログ例

```
[2025-12-07T06:30:00.000Z] 記事 1/17 の処理開始: e303cf655373992f61f4
[2025-12-07T06:30:01.000Z] 記事 1/17 の処理完了: e303cf655373992f61f4
```

## トラブルシューティング

### 検索結果が空の場合

1. **データが格納されているか確認**
   - Data Collection Workerのログを確認
   - エラーが発生していないか確認

2. **検索クエリを変更**
   - 別のキーワードで検索してみる
   - より一般的なキーワードで検索してみる

3. **Vectorizeインデックスを確認**
   - Cloudflare Dashboardでインデックスが作成されているか確認
   - インデックス名が正しいか確認（`kusoogle-articles`）

### エラーが発生する場合

1. **Search API Workerが起動しているか確認**
   ```bash
   curl http://localhost:8787/health
   ```

2. **エラーメッセージを確認**
   - ブラウザの開発者ツール（Consoleタブ）でエラーを確認
   - Search API Workerのログでエラーを確認

3. **環境変数を確認**
   - `NEXT_PUBLIC_SEARCH_API_URL`が正しく設定されているか確認

## 確認用スクリプト

以下のスクリプトで簡単に確認できます：

```bash
#!/bin/bash

# Search API WorkerのURL
SEARCH_API_URL="http://localhost:8787"

# ヘルスチェック
echo "ヘルスチェック..."
curl -s "$SEARCH_API_URL/health" | jq '.'

# 検索実行
echo ""
echo "検索実行: タスク管理"
curl -s -X POST "$SEARCH_API_URL/api/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"タスク管理"}' | jq '.'
```

## まとめ

最も簡単で確実な確認方法は、**Search APIで検索を実行**することです。検索結果が返ってくれば、データが正しく格納されています。

