# フロントエンドアーキテクチャ解説（初学者向け）

## 📚 目次
1. [Client/Serverコンポーネントとは](#clientserverコンポーネントとは)
2. [実行場所の違い](#実行場所の違い)
3. [通信の流れ](#通信の流れ)
4. [コード解説](#コード解説)
5. [なぜこの設計なのか](#なぜこの設計なのか)

---

## Client/Serverコンポーネントとは

### `'use client'` - クライアントコンポーネント

**実行場所**: ブラウザ（ユーザーのPC/スマホ）

**特徴**:
- ブラウザでJavaScriptとして実行される
- ユーザーの操作（クリック、入力など）に反応できる
- `useState`、`useEffect`などのReact Hooksが使える
- インタラクティブなUIを実装できる

**例**: 
```typescript
'use client';  // ← これがあるとクライアントコンポーネント

export default function SearchForm() {
  const [query, setQuery] = useState('');  // ← 状態管理ができる
  // ...
}
```

### `'use server'` - サーバーコンポーネント（Server Action）

**実行場所**: Next.jsサーバー（Node.js環境）

**特徴**:
- Next.jsサーバー上で実行される
- データベースや外部APIにアクセスできる
- 環境変数（`process.env`）に安全にアクセスできる
- ブラウザに送信されるコードに含まれない（セキュリティ上重要）

**例**:
```typescript
'use server';  // ← これがあるとサーバー側で実行される

export async function searchArticles(query: string) {
  // サーバー側で実行される
  const apiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL;  // ← 環境変数にアクセス可能
  // ...
}
```

### ディレクティブなし - サーバーコンポーネント（デフォルト）

**実行場所**: Next.jsサーバー（ビルド時またはリクエスト時）

**特徴**:
- Next.js 13以降のデフォルト
- 静的なHTMLを生成できる
- SEOに有利
- インタラクティブな機能は使えない

**例**:
```typescript
// 'use client'も'use server'もない = サーバーコンポーネント（デフォルト）

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

---

## 実行場所の違い

### 図解：コードがどこで実行されるか

```
┌─────────────────────────────────────────────────────────┐
│  ブラウザ（ユーザーのPC/スマホ）                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 'use client' コンポーネント                        │ │
│  │ - page.tsx (HomePage)                              │ │
│  │ - SearchForm.tsx                                   │ │
│  │ - SearchResults.tsx                                │ │
│  │ - ArticleCard.tsx                                  │ │
│  │                                                     │ │
│  │ 実行内容:                                          │ │
│  │ - useState で状態管理                              │ │
│  │ - ユーザーの入力を受け取る                          │ │
│  │ - UIの更新                                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP通信
┌─────────────────────────────────────────────────────────┐
│  Next.js (Cloudflare Workers, @opennextjs/cloudflare)   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 'use server' Server Action                        │ │
│  │ - search.ts (searchArticles関数)                   │ │
│  │                                                   │ │
│  │ 実行内容:                                          │ │
│  │ - 環境変数の読み込み                               │ │
│  │ - 外部APIへのリクエスト                           │ │
│  │ - データの処理                                     │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ サーバーコンポーネント（デフォルト）                │ │
│  │ - layout.tsx                                       │ │
│  │                                                   │ │
│  │ 実行内容:                                          │ │
│  │ - HTMLの生成                                       │ │
│  │ - メタデータの設定                                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP通信
┌─────────────────────────────────────────────────────────┐
│  Search API Worker（Cloudflare Workers）                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ - ベクトル検索の実行                               │ │
│  │ - Vectorizeへのアクセス                            │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 通信の流れ

### 検索実行時の通信フロー

```
1. ユーザーが検索フォームに入力して「検索」ボタンをクリック
   ↓
   [ブラウザ] SearchForm.tsx
   - handleSubmit が実行される
   - onSearch(query) が呼ばれる
   
2. 親コンポーネント（page.tsx）の handleSearch が実行される
   ↓
   [ブラウザ] page.tsx
   - setIsLoading(true) でローディング状態に
   - searchArticles(query) を呼び出す
   
3. Server Actionが実行される
   ↓
   [Next.jsサーバー] search.ts
   - 'use server' によりサーバー側で実行
   - process.env.NEXT_PUBLIC_SEARCH_API_URL を読み込み
   - fetch() で Search API Worker にHTTPリクエスト
   
4. Search API Workerが検索を実行
   ↓
   [Cloudflare Workers] search/index.ts
   - ベクトル検索を実行
   - 結果をJSONで返す
   
5. Server Actionが結果を受け取る
   ↓
   [Next.jsサーバー] search.ts
   - レスポンスをパース
   - エラーチェック
   - SearchResponse を返す
   
6. ブラウザで結果を受け取る
   ↓
   [ブラウザ] page.tsx
   - setResults(response.results) で結果を保存
   - setIsLoading(false) でローディング終了
   - SearchResults コンポーネントが結果を表示
```

### 重要なポイント

**❌ 間違った理解**:
- 「ClientとServerが直接通信している」

**✅ 正しい理解**:
- Client → Next.js Server（Server Action経由）
- Next.js Server → Search API Worker（HTTPリクエスト）
- 結果は逆のルートで返ってくる

---

## コード解説

### 1. `app/page.tsx` - メインページ（クライアントコンポーネント）

```typescript
'use client';  // ← ブラウザで実行される

export default function HomePage() {
    // useState: ブラウザで状態を管理
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState<string>('');

    // 検索処理（ブラウザで実行される）
    const handleSearch = async (searchQuery: string) => {
        setIsLoading(true);  // ローディング開始
        
        try {
            // Server Actionを呼び出す（内部的にHTTP通信が発生）
            const response = await searchArticles(searchQuery);
            setResults(response.results);  // 結果を保存
        } catch (err) {
            setError(err.message);  // エラーを保存
        } finally {
            setIsLoading(false);  // ローディング終了
        }
    };

    return (
        // JSX: ブラウザでレンダリングされる
        <div>
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            <SearchResults results={results} isLoading={isLoading} />
        </div>
    );
}
```

**ポイント**:
- `'use client'` があるので、ブラウザで実行される
- `useState` で状態管理ができる
- `handleSearch` は非同期関数（`async`）
- Server Action（`searchArticles`）を呼び出すと、内部的にHTTP通信が発生

### 2. `app/actions/search.ts` - Server Action

```typescript
'use server';  // ← Next.jsサーバーで実行される

export async function searchArticles(query: string): Promise<SearchResponse> {
  // サーバー側で実行されるコード
  // 環境変数に安全にアクセスできる
  const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:8787';

  // バリデーション（サーバー側で実行）
  if (query.trim().length === 0) {
    throw new Error('検索クエリを入力してください');
  }

  // 外部API（Search API Worker）にHTTPリクエスト
  const response = await fetch(`${SEARCH_API_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  // レスポンスを処理
  const data = await response.json();
  return data;
}
```

**ポイント**:
- `'use server'` があるので、Next.jsサーバーで実行される
- `process.env` にアクセスできる（ブラウザには送信されない）
- `fetch()` で外部APIにHTTPリクエストを送信
- この関数はブラウザから呼び出せるが、実行はサーバー側

### 3. `components/SearchForm.tsx` - 検索フォーム（クライアントコンポーネント）

```typescript
'use client';  // ← ブラウザで実行される

export default function SearchForm({ onSearch, isLoading }) {
    const [query, setQuery] = useState('');  // 入力値を管理

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();  // フォームのデフォルト動作を防ぐ
        onSearch(query);  // 親コンポーネントの関数を呼び出す
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}  // 入力値を更新
            />
            <button type="submit">検索</button>
        </form>
    );
}
```

**ポイント**:
- `'use client'` があるので、ブラウザで実行される
- `useState` で入力値を管理
- `onChange` でリアルタイムに入力値を更新
- `onSubmit` で親コンポーネントの関数を呼び出す

### 4. `app/layout.tsx` - レイアウト（サーバーコンポーネント）

```typescript
// 'use client'も'use server'もない = サーバーコンポーネント（デフォルト）

export default function RootLayout({ children }) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}
```

**ポイント**:
- ディレクティブがないので、サーバーコンポーネント（デフォルト）
- 静的なHTMLを生成
- SEOに有利

---

## なぜこの設計なのか

### 1. セキュリティ

**❌ 悪い例（クライアント側でAPIキーを扱う）**:
```typescript
'use client';
// これは危険！APIキーがブラウザに送信される
const API_KEY = 'secret-key-12345';  // ← 誰でも見れる
```

**✅ 良い例（サーバー側で環境変数を扱う）**:
```typescript
'use server';
// 安全！環境変数はサーバー側でのみアクセス可能
const API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL;  // ← ブラウザに送信されない
```

### 2. パフォーマンス

- **サーバーコンポーネント**: 静的なHTMLを生成できる（SEOに有利、初期表示が速い）
- **クライアントコンポーネント**: インタラクティブな機能を実装できる

### 3. 開発体験

- **型安全性**: TypeScriptで型チェックができる
- **自動最適化**: Next.jsが最適な場所でコードを実行
- **コード分割**: 必要なコードだけがブラウザに送信される

---

## まとめ

### 覚えておくべき3つのルール

1. **`'use client'`** = ブラウザで実行、インタラクティブな機能が使える
2. **`'use server'`** = Next.jsサーバーで実行、環境変数や外部APIにアクセスできる
3. **ディレクティブなし** = サーバーコンポーネント（デフォルト）、静的なHTMLを生成

### 通信の流れ

```
ユーザーの操作
  ↓
[ブラウザ] クライアントコンポーネント
  ↓ HTTP通信（Server Action経由）
[Next.jsサーバー] Server Action
  ↓ HTTPリクエスト
[外部API] Search API Worker
  ↓ レスポンス
[Next.jsサーバー] Server Action
  ↓ レスポンス
[ブラウザ] クライアントコンポーネント
  ↓
UI更新
```

### よくある質問

**Q: ClientとServerは直接通信しているの？**
A: いいえ。Client → Next.js Server（Server Action）→ 外部API という流れです。

**Q: なぜServer Actionを使うの？**
A: セキュリティ（環境変数の保護）とパフォーマンス（最適化）のためです。

**Q: すべてクライアントコンポーネントにすればいいのでは？**
A: いいえ。サーバーコンポーネントを使うと、初期表示が速く、SEOにも有利です。

---

## 参考資料

- [Next.js公式ドキュメント - Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Next.js公式ドキュメント - Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

## 関連ガイド

- [SSR vs CSR vs RSCの違い](./ssr-vs-csr-vs-rsc.md)
- [RSCとAPI Routesの違い](./rsc-vs-api-routes.md)

