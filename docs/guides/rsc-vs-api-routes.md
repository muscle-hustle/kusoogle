# RSC（React Server Components）とAPI Routesの違い

## 🤔 疑問

- Server ActionとAPI Routesはどう違う？
- どちらを使えばいいの？
- RPCって何？

## 📚 3つのサーバー側の機能

### 1. RSC（React Server Components）- サーバーコンポーネント

**実行場所**: Next.jsサーバー（ビルド時またはリクエスト時）

**特徴**:
- サーバー側でHTMLを生成
- クライアントにJavaScriptを送信しない（または最小限）
- データベースやファイルシステムに直接アクセス可能
- `useState`や`useEffect`などのHooksは使えない

**ファイル場所**: `app/page.tsx`、`app/layout.tsx`など（`'use client'`がない）

**例**:
```typescript
// app/page.tsx（サーバーコンポーネント）
import Image from 'next/image';

export default function HomePage() {
  // サーバー側で実行される
  // データベースにアクセス可能
  // const data = await db.query('SELECT * FROM articles');
  
  return (
    <div>
      <h1>kusoogle</h1>
      <Image src="/logo.png" alt="Logo" width={400} height={187} />
      {/* この部分はサーバー側でHTMLとして生成される */}
    </div>
  );
}
```

### 2. Server Actions - サーバー側の関数

**実行場所**: Next.jsサーバー（リクエスト時）

**特徴**:
- `'use server'`ディレクティブを使用
- クライアントから関数として直接呼び出せる（RPC的）
- 型安全性が高い
- 外部から直接アクセス不可（Next.jsアプリ内からのみ）

**ファイル場所**: `app/actions/`ディレクトリ

**例**:
```typescript
// app/actions/search.ts
'use server';

export async function searchArticles(query: string): Promise<SearchResponse> {
  // サーバー側で実行される
  // 環境変数にアクセス可能
  const apiUrl = process.env.NEXT_PUBLIC_SEARCH_API_URL;
  
  // 外部APIにリクエスト
  const response = await fetch(`${apiUrl}/api/search`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  
  return await response.json();
}
```

**呼び出し方**:
```typescript
// クライアントコンポーネントから
import { searchArticles } from '../app/actions/search';

const handleSearch = async () => {
  const result = await searchArticles('タスク管理'); // 関数として直接呼び出し
  setResults(result.results);
};
```

### 3. API Routes - HTTPエンドポイント

**実行場所**: Next.jsサーバー（リクエスト時）

**特徴**:
- `app/api/`ディレクトリに`route.ts`を作成
- HTTPリクエスト/レスポンスを扱う
- 外部から直接アクセス可能（公開エンドポイント）
- RESTful APIとして使用可能

**ファイル場所**: `app/api/`ディレクトリ

**例**:
```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // HTTPリクエストを処理
  const body = await request.json();
  const { query } = body;
  
  // 検索処理
  const results = await performSearch(query);
  
  // HTTPレスポンスを返す
  return NextResponse.json({ results });
}
```

**呼び出し方**:
```typescript
// クライアントコンポーネントから
const handleSearch = async () => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'タスク管理' }),
  });
  const data = await response.json();
  setResults(data.results);
};
```

---

## 🔍 詳しく見てみよう

### RPC（Remote Procedure Call）とは

**RPC**は、リモートの関数をローカル関数のように呼び出す仕組みです。

**通常の関数呼び出し（ローカル）**:
```typescript
// 同じプロセス内で実行
const result = calculateSum(1, 2);
```

**RPC（リモート関数呼び出し）**:
```typescript
// 見た目は同じだが、実際はネットワーク越しに実行
const result = await searchArticles(query); // ← Server Action
```

Next.jsのServer ActionはRPC的なアプローチです。開発者は関数を呼び出すだけですが、内部ではHTTP通信が行われます。

### 実際の通信の流れ

#### Server Actionの場合

```
[ブラウザ] SearchPageClient.tsx
  ↓
  const response = await searchArticles(searchQuery);
  ↓
[Next.js Server] app/actions/search.ts (Server Action)
  ↓ HTTPリクエスト（内部的に生成される）
  POST /_next/action/xxxxx
  Body: { query: "タスク管理" }
  ↓
[Next.js Server] app/actions/search.ts
  ↓ HTTPリクエスト（明示的にfetch）
  POST http://localhost:8787/api/search
  Body: { query: "タスク管理" }
  ↓
[Cloudflare Workers] Search API Worker
  ↓ レスポンス
  { results: [...], query: "タスク管理", timestamp: "..." }
  ↓
[Next.js Server] app/actions/search.ts
  ↓ レスポンス（内部的に返される）
  { results: [...], query: "タスク管理", timestamp: "..." }
  ↓
[ブラウザ] SearchPageClient.tsx
  setResults(response.results);
```

#### API Routesの場合

```
[ブラウザ] クライアントコンポーネント
  ↓
  fetch('/api/search', { method: 'POST', body: JSON.stringify({ query }) })
  ↓ HTTPリクエスト（明示的）
  POST /api/search
  Body: { query: "タスク管理" }
  ↓
[Next.js Server] app/api/search/route.ts
  ↓ 処理
  const results = await performSearch(query);
  ↓ HTTPレスポンス（明示的）
  { results: [...] }
  ↓
[ブラウザ] クライアントコンポーネント
  const data = await response.json();
```

---

## 📊 比較表

| 項目 | RSC（サーバーコンポーネント） | Server Actions | API Routes |
|------|------------------------------|----------------|------------|
| **用途** | HTMLの生成 | サーバー側の関数呼び出し | HTTPエンドポイント |
| **ディレクティブ** | なし（デフォルト） | `'use server'` | なし |
| **ファイル場所** | `app/page.tsx`など | `app/actions/` | `app/api/` |
| **呼び出し方法** | 自動（コンポーネントとして） | 関数として直接呼び出し | `fetch()`でHTTPリクエスト |
| **型安全性** | TypeScriptの型がそのまま使える | TypeScriptの型がそのまま使える | 手動で型チェックが必要 |
| **外部アクセス** | 不可 | 不可（Next.js内のみ） | 可能（公開エンドポイント） |
| **プロトコル** | HTML生成 | RPC的（関数呼び出し） | HTTP（RESTful） |
| **コード量** | 少ない | 少ない | 多い（リクエスト/レスポンス処理が必要） |
| **使用例** | 静的なページ、データ取得 | フォーム送信、データ更新 | Webhook、公開API、モバイルアプリ |

---

## 🎯 使い分けの指針

### RSC（サーバーコンポーネント）を使う場合

✅ **適している**:
- 静的なコンテンツの表示
- データベースからのデータ取得と表示
- SEOが重要なページ
- 初期表示を速くしたい

❌ **適していない**:
- インタラクティブな機能（`useState`、`useEffect`など）
- ユーザーの操作に反応する処理

**例**:
```typescript
// app/page.tsx（サーバーコンポーネント）
export default function HomePage() {
  // サーバー側でデータを取得
  const articles = await db.getArticles();
  
  return (
    <div>
      <h1>記事一覧</h1>
      {articles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
```

### Server Actionsを使う場合

✅ **適している**:
- Next.jsアプリ内からのみアクセス
- フォーム送信やボタンクリックなどのUI操作
- 型安全性を重視
- シンプルに実装したい

❌ **適していない**:
- 外部から直接アクセスが必要
- 公開APIを提供する
- 特定のHTTPメソッドやステータスコードを制御したい

**例**（現在のkusoogleの実装）:
```typescript
// app/actions/search.ts
'use server';

export async function searchArticles(query: string): Promise<SearchResponse> {
  // バリデーション
  const parseResult = searchQuerySchema.safeParse(query);
  if (!parseResult.success) {
    throw new Error('検索クエリのバリデーションに失敗しました');
  }
  
  // 外部APIにリクエスト
  const response = await fetch(`${SEARCH_API_URL}/api/search`, {
    method: 'POST',
    body: JSON.stringify({ query: parseResult.data }),
  });
  
  return await response.json();
}
```

### API Routesを使う場合

✅ **適している**:
- 外部から直接アクセスが必要（Webhook、モバイルアプリなど）
- 公開APIを提供する
- 特定のHTTPメソッドやステータスコードを制御したい
- CORS設定が必要

❌ **適していない**:
- Next.jsアプリ内からのみアクセス
- 型安全性を重視（手動で型チェックが必要）

**例**:
```typescript
// app/api/webhook/route.ts
export async function POST(request: NextRequest) {
  // Webhookの検証
  const signature = request.headers.get('x-signature');
  if (!verifySignature(signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const body = await request.json();
  // 処理...
  
  return NextResponse.json({ success: true });
}
```

---

## 🔍 実際のコードで見てみよう

### 現在のkusoogleの実装

#### 1. RSC（サーバーコンポーネント）

```typescript
// app/page.tsx
import SearchPageClient from '../components/SearchPageClient';
import Footer from '../components/Footer';
import Image from 'next/image';

/**
 * ホームページ（サーバーコンポーネント）
 * 静的な部分（ヘッダー）はサーバー側でHTMLとして生成される
 */
export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header - サーバー側でHTMLとして生成される */}
            <header className="w-full pt-16 pb-8 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <Image
                        src="/images/logo.png"
                        alt="kusoogle"
                        width={400}
                        height={187}
                        priority
                    />
                </div>
            </header>

            {/* Main Content - インタラクティブな部分はクライアントコンポーネント */}
            <main className="flex-1 w-full px-4 pb-8">
                <SearchPageClient />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
```

**特徴**:
- `'use client'`がない = サーバーコンポーネント
- 静的な部分（ヘッダー、フッター）はサーバー側でHTMLとして生成
- SEOに有利
- 初期表示が速い

#### 2. Server Action

```typescript
// app/actions/search.ts
'use server';

export async function searchArticles(query: string): Promise<SearchResponse> {
    // バリデーション（Zodスキーマを使用）
    const parseResult = searchQuerySchema.safeParse(query);
    if (!parseResult.success) {
        const errorMessage = getValidationErrorMessage(parseResult);
        throw new Error(errorMessage || '検索クエリのバリデーションに失敗しました');
    }
    
    // 外部APIにリクエスト
    const response = await fetch(`${SEARCH_API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: parseResult.data }),
    });
    
    return await response.json();
}
```

**特徴**:
- `'use server'`ディレクティブ
- 関数として直接呼び出せる
- 型安全性が高い
- Next.jsアプリ内からのみアクセス可能

#### 3. クライアントコンポーネントからの呼び出し

```typescript
// components/SearchPageClient.tsx
'use client';

import { searchArticles } from '../app/actions/search';

export default function SearchPageClient() {
    const handleSearch = async (searchQuery: string) => {
        try {
            // Server Actionを関数として直接呼び出し
            const response = await searchArticles(searchQuery);
            setResults(response.results);
        } catch (err) {
            setError(err.message);
        }
    };
    
    return (
        <div>
            <SearchForm onSearch={handleSearch} />
            <SearchResults results={results} />
        </div>
    );
}
```

---

## 🎯 まとめ

### RSC（サーバーコンポーネント）

- **用途**: HTMLの生成
- **特徴**: サーバー側で実行、JavaScriptを送信しない（または最小限）
- **使用例**: 静的なページ、データ取得と表示

### Server Actions

- **用途**: サーバー側の関数呼び出し（RPC的）
- **特徴**: 関数として直接呼び出せる、型安全性が高い
- **使用例**: フォーム送信、データ更新、Next.jsアプリ内からのアクセス

### API Routes

- **用途**: HTTPエンドポイント（RESTful API）
- **特徴**: 外部から直接アクセス可能、HTTPリクエスト/レスポンスを扱う
- **使用例**: Webhook、公開API、モバイルアプリ

### 現在のkusoogleでの使い分け

1. **RSC**: `app/page.tsx`で静的な部分（ヘッダー、フッター）を生成
2. **Server Actions**: `app/actions/search.ts`で検索処理を実行
3. **API Routes**: 使用していない（現時点では不要）

この構成は適切です。将来的に外部からアクセスが必要になった場合（例: Webhook、モバイルアプリ）は、その時点でAPI Routesを追加すれば十分です。

---

## 🔗 参考資料

- [Next.js公式 - Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js公式 - Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js公式 - Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React公式 - Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)

