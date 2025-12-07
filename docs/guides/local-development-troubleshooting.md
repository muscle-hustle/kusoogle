# ローカル開発環境でのトラブルシューティング

## 🔍 検索エラーの確認方法

### 1. ブラウザの開発者ツールでエラーを確認

1. **開発者ツールを開く**
   - Chrome/Edge: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Safari: `Cmd+Option+I` (開発者メニューを有効化する必要があります)

2. **Consoleタブを確認**
   - エラーメッセージが表示されます
   - 赤いエラーアイコンをクリックして詳細を確認

3. **Networkタブを確認**
   - 検索実行時に `/api/search` へのリクエストを確認
   - ステータスコード（200, 404, 500など）を確認
   - レスポンスの内容を確認

### 2. よくあるエラーと対処法

#### エラー: `Failed to fetch` または `Network Error`

**原因**: Search API Workerが起動していない

**対処法**:
```bash
# Search API Workerを起動
cd /Users/sei/Sites/kusoogle
bun run dev:search
```

別のターミナルで起動する必要があります。

#### エラー: `404 Not Found`

**原因**: Search API WorkerのURLが間違っている

**対処法**:
1. `.env.local`ファイルを確認
   ```bash
   # apps/frontend/.env.local
   NEXT_PUBLIC_SEARCH_API_URL=http://localhost:8787
   ```

2. Search API Workerが正しいポートで起動しているか確認
   - デフォルトは `http://localhost:8787`

#### エラー: `500 Internal Server Error` または `error code: 1031`

**原因**: Search API Worker側のエラー

**考えられる原因**:
1. **AI Workersエラー（error code: 1031）**
   - 開発環境でAI Workersを使用するには、Cloudflareアカウントにログインしている必要があります

2. **Vectorizeバインディングエラー（`Binding VECTORIZE_INDEX needs to be run remotely`）**
   - Vectorizeはローカル環境では直接使用できず、リモート実行が必要です
   - `wrangler dev --remote`を使用する必要があります

3. **Vectorizeインデックスが存在しない**
   - Vectorizeインデックスを作成する必要があります

4. **環境変数が設定されていない**

**対処法**:
1. **AI Workersエラーの場合**:
   ```bash
   # Cloudflareアカウントにログイン
   bunx wrangler login
   
   # Search API Workerを再起動
   bun run dev:search
   ```

2. **Vectorizeバインディングエラーの場合**:
   - `apps/workers/search/package.json`の`dev`スクリプトが`wrangler dev --remote`になっているか確認
   - なっていない場合は修正して再起動
   ```bash
   # Search API Workerを再起動
   bun run dev:search
   ```

3. Search API Workerのログを確認
   - `bun run dev:search` を実行しているターミナルにエラーが表示されます

4. Vectorizeインデックスが作成されているか確認
   - Vectorizeインデックスが存在しない場合でも、検索API自体は動作します（結果が空になるだけ）

### 3. ローカル開発環境の起動手順

#### 必要なサービス

1. **フロントエンド** (Next.js)
2. **Search API Worker** (Cloudflare Workers)

#### 起動手順

**ターミナル1: フロントエンド**
```bash
cd /Users/sei/Sites/kusoogle
bun run dev:frontend
```
→ `http://localhost:3000` で起動

**ターミナル2: Search API Worker**
```bash
cd /Users/sei/Sites/kusoogle
bun run dev:search
```
→ `http://localhost:8787` で起動

#### 確認方法

1. **フロントエンドが起動しているか確認**
   ```bash
   curl http://localhost:3000
   ```

2. **Search API Workerが起動しているか確認**
   ```bash
   curl http://localhost:8787/health
   ```
   レスポンス: `{"status":"ok"}` が返ってくれば正常

3. **検索APIを直接テスト**
   ```bash
   curl -X POST http://localhost:8787/api/search \
     -H "Content-Type: application/json" \
     -d '{"query":"タスク管理"}'
   ```

### 4. 環境変数の確認

#### フロントエンドの環境変数

`apps/frontend/.env.local`:
```env
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:8787
```

#### Search API Workerの環境変数

`apps/workers/search/.dev.vars` (開発環境用):
```env
VECTORIZE_INDEX_NAME=your-index-name
AI_API_TOKEN=your-token
```

### 5. ログの確認方法

#### フロントエンドのログ

- ブラウザのConsoleタブで確認
- サーバー側のログはターミナルに表示

#### Search API Workerのログ

- `wrangler dev` を実行しているターミナルに表示
- リクエストとレスポンスの詳細が表示されます

### 6. デバッグのヒント

#### 検索が動作しない場合

1. **Networkタブでリクエストを確認**
   - リクエストが送信されているか
   - レスポンスのステータスコード
   - レスポンスの内容

2. **Consoleタブでエラーを確認**
   - JavaScriptエラー
   - ネットワークエラー

3. **Search API Workerのログを確認**
   - リクエストが到達しているか
   - エラーメッセージ

#### よくある問題

**問題**: 検索ボタンをクリックしても何も起こらない

**確認事項**:
- ブラウザのConsoleにエラーがないか
- Networkタブでリクエストが送信されているか
- Search API Workerが起動しているか

**問題**: 検索結果が表示されない

**確認事項**:
- レスポンスの内容を確認（Networkタブ）
- データの形式が正しいか
- エラーメッセージがないか

### 7. 開発者ツールの使い方

#### Consoleタブ

- `console.log()` でデバッグ情報を出力
- エラーメッセージを確認
- 変数の値を確認

#### Networkタブ

- リクエストとレスポンスを確認
- ステータスコードを確認
- リクエストボディとレスポンスボディを確認

#### Sourcesタブ

- ブレークポイントを設定
- ステップ実行でデバッグ
- 変数の値を確認

### 8. トラブルシューティングチェックリスト

- [ ] フロントエンドが起動している (`http://localhost:3000`)
- [ ] Search API Workerが起動している (`http://localhost:8787`)
- [ ] 環境変数が正しく設定されている
- [ ] ブラウザのConsoleにエラーがない
- [ ] Networkタブでリクエストが送信されている
- [ ] レスポンスのステータスコードが200
- [ ] Vectorizeインデックスが作成されている

### 9. よくあるエラーメッセージ

| エラーメッセージ | 原因 | 対処法 |
|----------------|------|--------|
| `Failed to fetch` | Search API Workerが起動していない | `bun run dev:search` を実行 |
| `404 Not Found` | URLが間違っている | 環境変数を確認 |
| `500 Internal Server Error` | サーバー側のエラー | Search API Workerのログを確認 |
| `CORS error` | CORS設定の問題 | Search API WorkerのCORS設定を確認 |

### 10. ヘルプが必要な場合

1. ブラウザのConsoleのエラーメッセージをコピー
2. Networkタブのリクエスト/レスポンスを確認
3. Search API Workerのログを確認
4. 上記の情報を共有してサポートを依頼

