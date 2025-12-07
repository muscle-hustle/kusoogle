# 検索エラーのトラブルシューティング

## 🔍 エラーの確認方法

### ブラウザの開発者ツールで確認

1. **開発者ツールを開く**
   - `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **Consoleタブでエラーを確認**
   - 赤いエラーアイコンをクリック
   - エラーメッセージの全文をコピー

3. **Networkタブでリクエストを確認**
   - 検索実行時に `/api/search` へのリクエストを確認
   - ステータスコード（200, 404, 500など）を確認
   - レスポンスの内容を確認

## 🚨 よくあるエラーと対処法

### エラー: `検索サーバーに接続できません`

**原因**: Search API Workerが起動していない

**対処法**:
```bash
# 別のターミナルでSearch API Workerを起動
cd /Users/sei/Sites/kusoogle
bun run dev:search
```

**確認方法**:
```bash
curl http://localhost:8787/health
# レスポンス: {"status":"ok"} が返ってくれば正常
```

### エラー: `404 Not Found`

**原因**: Search API WorkerのURLが間違っている

**対処法**:
1. `.env.local`ファイルを確認
   ```bash
   # apps/frontend/.env.local
   NEXT_PUBLIC_SEARCH_API_URL=http://localhost:8787
   ```

2. フロントエンドを再起動
   ```bash
   # フロントエンドを停止して再起動
   bun run dev:frontend
   ```

### エラー: `500 Internal Server Error` または `検索処理に失敗しました`

**原因**: Search API Worker側のエラー

**考えられる原因**:
1. **Vectorizeインデックスが存在しない**
   - Vectorizeインデックスを作成する必要があります

2. **AI Workersの設定が正しくない**
   - `wrangler.toml`の設定を確認
   - 開発環境でAI Workersを使用するには、Cloudflareアカウントにログインしている必要があります

3. **環境変数が設定されていない**
   - `.dev.vars`ファイルを確認

4. **Vectorizeバインディングエラー（`Binding VECTORIZE_INDEX needs to be run remotely`）**
   - Vectorizeはローカル環境では直接使用できず、リモート実行が必要です
   - `wrangler dev --remote`を使用する必要があります

**対処法**:
1. Search API Workerのログを確認
   - `bun run dev:search` を実行しているターミナルにエラーが表示されます

2. **AI Workersエラー（error code: 1031）の場合**:
   ```bash
   # Cloudflareアカウントにログイン
   bunx wrangler login
   
   # Search API Workerを再起動
   bun run dev:search
   ```
   
   このエラーは、開発環境でAI Workersを使用する際に、Cloudflareアカウントにログインしていない場合に発生します。

3. **Vectorizeバインディングエラーの場合**:
   - `package.json`の`dev`スクリプトが`wrangler dev --remote`になっているか確認
   - なっていない場合は、`apps/workers/search/package.json`を修正
   - Search API Workerを再起動

4. Vectorizeインデックスを作成
   ```bash
   # Vectorizeインデックスを作成（初回のみ）
   bunx wrangler vectorize create kusoogle-articles --dimensions=768 --metric=cosine
   ```

### エラー: `CORS error` または `Access-Control-Allow-Origin`

**原因**: CORS設定の問題

**対処法**:
- Search API WorkerのCORS設定を確認
- `apps/workers/search/src/index.ts`でCORSが正しく設定されているか確認

### エラー: `検索結果の形式が正しくありません`

**原因**: レスポンスの形式が期待と異なる

**対処法**:
1. Networkタブでレスポンスの内容を確認
2. Search API Workerのレスポンス形式を確認

## 🔧 デバッグ手順

### 1. 基本的な確認

- [ ] フロントエンドが起動している (`http://localhost:3000`)
- [ ] Search API Workerが起動している (`http://localhost:8787`)
- [ ] 環境変数が正しく設定されている

### 2. ネットワーク接続の確認

```bash
# Search API Workerが応答するか確認
curl http://localhost:8787/health

# 検索APIを直接テスト
curl -X POST http://localhost:8787/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"タスク管理"}'
```

### 3. ログの確認

**フロントエンドのログ**:
- ブラウザのConsoleタブ
- サーバー側のログはターミナルに表示

**Search API Workerのログ**:
- `bun run dev:search` を実行しているターミナル
- リクエストとレスポンスの詳細が表示されます

### 4. エラーメッセージの詳細を確認

ブラウザのConsoleタブで、エラーメッセージの全文を確認してください。改善されたエラーハンドリングにより、より詳細なエラーメッセージが表示されるようになりました。

## 📝 エラー報告時の情報

エラーが解決しない場合は、以下の情報を共有してください：

1. **エラーメッセージの全文**（Consoleタブからコピー）
2. **Networkタブの情報**:
   - リクエストURL
   - ステータスコード
   - レスポンスボディ
3. **Search API Workerのログ**（ターミナルの出力）
4. **実行環境**:
   - OS
   - Node.js/Bunのバージョン
   - ブラウザの種類とバージョン

## 🎯 クイックチェックリスト

検索が動作しない場合、以下を順番に確認：

1. ✅ Search API Workerが起動しているか
2. ✅ フロントエンドが起動しているか
3. ✅ 環境変数が正しく設定されているか
4. ✅ ブラウザのConsoleにエラーがないか
5. ✅ Networkタブでリクエストが送信されているか
6. ✅ Vectorizeインデックスが作成されているか

