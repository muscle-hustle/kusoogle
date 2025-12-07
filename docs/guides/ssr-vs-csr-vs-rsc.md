# SSR vs CSR vs RSC（サーバーコンポーネント）の違い

## 🤔 疑問

- サーバーコンポーネントはSSRってこと？
- 通常のReactだとどうなる？

## 📚 3つのレンダリング方式

### 1. CSR（Client-Side Rendering）- 通常のReact

**実行場所**: ブラウザのみ

**特徴**:
- すべてのレンダリングがブラウザで行われる
- サーバーは空のHTMLとJavaScriptファイルを送信するだけ
- Reactアプリの標準的な動作

**例**: Create React App、Viteで作ったReactアプリ

### 2. SSR（Server-Side Rendering）- 従来のNext.js

**実行場所**: サーバー（初回） + ブラウザ（以降）

**特徴**:
- 初回リクエスト時にサーバーでHTMLを生成
- ブラウザに完成したHTMLを送信
- その後、クライアント側でReactがハイドレーション（接続）

**例**: Next.js 12以前（Pages Router）

### 3. RSC（React Server Components）- 新しいNext.js

**実行場所**: サーバー（静的/動的） + ブラウザ（インタラクティブ部分のみ）

**特徴**:
- サーバーコンポーネントはサーバー側で実行
- 静的な部分はHTMLとして送信
- インタラクティブな部分だけクライアントコンポーネント
- JavaScriptのサイズが最小限

**例**: Next.js 13以降（App Router）

---

## 🔍 詳しく見てみよう

### パターン1: CSR（通常のReact）

```typescript
// App.jsx（通常のReact）
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello World</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}

export default App;
```

**サーバーが送信するHTML**:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>  <!-- 空！ -->
    <script src="/bundle.js"></script>  <!-- すべてのコード（500KB以上） -->
  </body>
</html>
```

**実行の流れ**:
```
1. ブラウザがページをリクエスト
   ↓
2. サーバーが空のHTMLを送信
   <div id="root"></div>
   ↓
3. ブラウザがJavaScriptファイルをダウンロード（500KB以上）
   ↓
4. JavaScriptを実行
   ↓
5. Reactが起動
   ↓
6. コンポーネントをレンダリング
   ↓
7. やっと画面が表示される ⏱️ 2-3秒
```

**問題点**:
- 初期表示が遅い（真っ白な画面が2-3秒）
- SEOに不利（検索エンジンが空のHTMLしか見れない）
- JavaScriptファイルが大きい

---

### パターン2: SSR（従来のNext.js）

```typescript
// pages/index.js（Next.js Pages Router）
export default function HomePage() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>This is server-side rendered</p>
    </div>
  );
}
```

**サーバーが送信するHTML**:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="__next">
      <div>
        <h1>Hello World</h1>  <!-- すでにHTMLになっている！ -->
        <p>This is server-side rendered</p>
      </div>
    </div>
    <script src="/_next/static/chunks/main.js"></script>  <!-- すべてのコード（500KB以上） -->
  </body>
</html>
```

**実行の流れ**:
```
1. ブラウザがページをリクエスト
   ↓
2. サーバーでReactコンポーネントを実行
   ↓
3. HTMLを生成
   ↓
4. 完成したHTMLを送信
   <div><h1>Hello World</h1></div>
   ↓
5. ブラウザがすぐにHTMLを表示 ⚡ 0.5秒
   ↓
6. バックグラウンドでJavaScriptをダウンロード（500KB以上）
   ↓
7. ハイドレーション（HTMLにReactを接続）
```

**メリット**:
- 初期表示が速い（HTMLが完成している）
- SEOに有利（検索エンジンがHTMLを見れる）

**問題点**:
- すべてのコンポーネントがJavaScriptとして送信される（500KB以上）
- 静的な部分もハイドレーションが必要

---

### パターン3: RSC（React Server Components）- 新しいNext.js

```typescript
// app/page.tsx（Next.js App Router）
// 'use client' がない = サーバーコンポーネント

export default function HomePage() {
  // このコンポーネントはサーバー側で実行される
  // useState は使えない（サーバーコンポーネントでは使えない）
  
  return (
    <div>
      <h1>Hello World</h1>  {/* ← サーバー側でHTMLになる */}
      <InteractiveButton />  {/* ← クライアントコンポーネント */}
    </div>
  );
}
```

```typescript
// components/InteractiveButton.tsx
'use client';  // ← インタラクティブな部分だけクライアント

import { useState } from 'react';

export default function InteractiveButton() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**サーバーが送信するHTML**:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="__next">
      <div>
        <h1>Hello World</h1>  <!-- サーバー側で生成されたHTML -->
        <div id="interactive-button-root"></div>  <!-- インタラクティブな部分だけ空 -->
      </div>
    </div>
    <!-- 必要なJavaScriptだけ送信 -->
    <script src="/_next/static/chunks/components/InteractiveButton.js"></script>  <!-- 小さいファイル（50KB） -->
  </body>
</html>
```

**実行の流れ**:
```
1. ブラウザがページをリクエスト
   ↓
2. サーバーでサーバーコンポーネントを実行
   ↓
3. 静的な部分をHTMLとして生成
   ↓
4. 完成したHTMLを送信
   <div><h1>Hello World</h1></div>
   ↓
5. ブラウザがすぐにHTMLを表示 ⚡ 0.3秒
   ↓
6. バックグラウンドで小さなJavaScriptファイルをダウンロード（50KB）
   ↓
7. インタラクティブな部分だけハイドレーション
```

**メリット**:
- 初期表示が最も速い
- JavaScriptファイルが小さい（必要な部分だけ）
- SEOに有利
- 静的な部分はハイドレーション不要

---

## 📊 比較表

| 項目 | CSR（通常のReact） | SSR（従来のNext.js） | RSC（新しいNext.js） |
|------|-------------------|---------------------|---------------------|
| **実行場所** | ブラウザのみ | サーバー（初回）+ ブラウザ | サーバー + ブラウザ（必要な部分のみ） |
| **初期HTML** | 空（`<div id="root"></div>`） | 完成したHTML | 完成したHTML |
| **JavaScriptサイズ** | 500KB以上 | 500KB以上 | 50-100KB（必要な部分だけ） |
| **初期表示** | 2-3秒（遅い） | 0.5秒（速い） | 0.3秒（最も速い） |
| **SEO** | 不利 | 有利 | 有利 |
| **ハイドレーション** | 不要（すべてクライアント） | 必要（すべて） | 必要（インタラクティブ部分のみ） |
| **例** | Create React App | Next.js 12以前 | Next.js 13以降 |

---

## 🔍 実際のコードで見てみよう

### 現在のkusoogleのコード

```typescript
// app/page.tsx
'use client';  // ← すべてクライアントコンポーネント

export default function HomePage() {
    const [results, setResults] = useState([]);
    
    return (
        <div>
            {/* このヘッダーもJavaScriptで生成される */}
            <header>
                <h1>kusoogle</h1>  {/* ← 静的なのにJSで生成 */}
            </header>
            <SearchForm />  {/* ← インタラクティブな部分 */}
        </div>
    );
}
```

**これはCSR（Client-Side Rendering）に近い**:
- すべてがクライアントコンポーネント
- サーバーは空のHTMLを送信
- すべてのコードがJavaScriptとして送信される

### 最適化版（RSCを使う）

```typescript
// app/page.tsx（サーバーコンポーネント）
// 'use client' を削除

export default function HomePage() {
    // サーバー側で実行される
    // 静的な部分はHTMLとして生成される
    
    return (
        <div>
            {/* この部分はサーバー側でHTMLになる → すぐに表示される */}
            <header>
                <h1>kusoogle</h1>  {/* ← サーバー側でHTML生成 */}
            </header>
            
            {/* インタラクティブな部分だけクライアントコンポーネント */}
            <SearchPageClient />
        </div>
    );
}
```

```typescript
// components/SearchPageClient.tsx
'use client';  // ← インタラクティブな部分だけクライアント

export default function SearchPageClient() {
    const [results, setResults] = useState([]);
    // ... インタラクティブな処理
    
    return (
        <>
            <SearchForm onSearch={handleSearch} />
            <SearchResults results={results} />
        </>
    );
}
```

**これはRSC（React Server Components）**:
- 静的な部分はサーバーコンポーネント
- インタラクティブな部分だけクライアントコンポーネント
- JavaScriptファイルが小さい

---

## 🎯 まとめ

### サーバーコンポーネントはSSR？

**答え**: はい、でも従来のSSRより進化している

- **従来のSSR**: すべてのコンポーネントがサーバーで実行されるが、すべてのコードがJavaScriptとして送信される
- **RSC（サーバーコンポーネント）**: サーバーコンポーネントはサーバーで実行され、必要な部分だけがJavaScriptとして送信される

### 通常のReactとの違い

**通常のReact（CSR）**:
- すべてがクライアントサイドレンダリング
- サーバーは空のHTMLを送信
- すべてのコードがJavaScriptとして送信される（500KB以上）
- 初期表示が遅い（2-3秒）

**Next.jsのサーバーコンポーネント（RSC）**:
- サーバー側でHTMLを生成
- 必要な部分だけがJavaScriptとして送信される（50-100KB）
- 初期表示が速い（0.3秒）

### 使い分け

- **CSR**: シンプルなSPA、SEOが不要なアプリ
- **SSR**: SEOが必要、初期表示を速くしたい
- **RSC**: 最新のNext.js、最も最適化された方法

---

## 🔗 参考資料

- [Next.js公式 - Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React公式 - Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [Web.dev - Rendering on the Web](https://web.dev/rendering-on-the-web/)

## 関連ガイド

- [フロントエンドアーキテクチャ解説](./frontend-architecture-explanation.md)
- [RSCとAPI Routesの違い](./rsc-vs-api-routes.md)

