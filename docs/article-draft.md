# 世界初のクソアプリ検索エンジン「kusoogle」を作った

本記事はクソアプリアドベントカレンダー2025の記事です。

## はじめに：クソアプリ開発者の永遠の悩み

人類は生成AIという武器を手に入れ、誰もが気軽にクソアプリを作れるようになった。私もその一人だ。  
クソアプリアドベントカレンダーに参加しようと思い立った時、誰もが直面する問題がある。

**「このクソアプリ、過去に誰か作ってない？」**

どうせ作るならネタが被っていない斬新なクソを生み出したいものである。  
「タスク管理アプリ」「目覚まし時計」「ゲームアプリ」...。  
過去10年分のクソアプリアドベントカレンダーには、約400件の記事が存在する。  
手動で全部確認するのは現実的ではない。

「もし、意味的に似たクソアプリを自動で検索できたら...」

自分のため、全てのクソアプリ開発者のために、**「クソアプリ検索エンジン」**を作った。  
なお、このネタが被っていないことは目視で確認済みである（被ってたらごめんなさい）。  
完成した検索エンジンで検索しても類似クソアプリはな・・・かったかどうかはぜひご自身で確認いただきたい。

## 0. 完成したWEBアプリ

**🔗 公開中のWEBアプリはコチラ↓**

[kusoogle](https://kusoogle.muscle-hustle.workers.dev/)

## 1. 誰のための何をするアプリか

### 対象ユーザー

**全てのクソアプリ開発者**

### 何をするアプリか

1. **過去のクソアプリ記事を自動収集**
   - Qiita APIから2015年から続くクソアプリアドベントカレンダー記事を取得
   - 日次で最新記事を自動更新（予定）

2. **意味的類似性による検索**
   - 単なるキーワードマッチングではなく、**ベクトル検索**で意味的に似た記事を検索
   - 「タスク管理」と検索すると、「TODOアプリ」「スケジュール管理ツール」などもヒット（したらいいなぁ）
   - Qiita利用規約に則り、記事本文そのものは保持していない

3. **類似度スコアの表示**
   - 検索結果に類似度スコアを表示
   - 類似度が高い = アイデアが被っている可能性が高い

### 使用例

```
検索クエリ: "目覚まし時計"
→ 類似記事: 「ずんだもんに叫ばれる目覚ましアプリ」（類似度: 0.85）
→ 判定: アイデアが被っている可能性が高い
```

## 2. 技術要素の解説

### 2.1 ベクトル検索の実装

**なぜベクトル検索なのか？**

単純なキーワードマッチングでは、「タスク管理」と検索しても「TODOアプリ」はヒットしない。  
しかし、**意味的には同じ**なので、ヒットしてほしい。

ベクトル検索なら、テキストを数値ベクトル（Embedding）に変換し、**意味的な類似度**を計算できる。

**実装の流れ：**

```typescript
// 1. 記事をEmbedding化（データ収集時）
const articleText = `${title} ${tags} ${summary}`;
const embedding = await ai.run('@cf/baai/bge-base-en-v1.5', {
  text: articleText,
});

// 2. Vectorizeに保存
await vectorizeIndex.upsert([{
  id: articleId,
  values: embedding,
  metadata: { title, url, tags, ... }
}]);

// 3. 検索時：クエリをEmbedding化して検索
const queryEmbedding = await ai.run('@cf/baai/bge-base-en-v1.5', {
  text: query,
});
const results = await vectorizeIndex.query(queryEmbedding, {
  topK: 20,
});
```

**技術スタック：**
- **Cloudflare Vectorize**: エッジベースのベクトルDB（無料枠あり）
- **Cloudflare AI Workers**: Embedding生成（`@cf/baai/bge-base-en-v1.5`、768次元）
- **コサイン類似度**: ベクトル間の類似度計算（0-1の範囲）

### 2.2 要約アプローチによる精度向上

**問題：長文記事の意味が平均化される**

5000文字の長文記事をそのままEmbedding化すると、重要な情報が埋もれてしまう。  
「目覚ましアプリ」「タスク管理」といった具体的な検索クエリにマッチしにくい。

**解決策：要約してからEmbedding化**

```typescript
// 記事本文を要約（LLM使用）
const summary = await summarizeArticle(article.body, ai, 300);

// 要約 + タイトル + タグでEmbedding生成
const text = `${summary} ${article.title} ${tagsText}`;
const embedding = await generateEmbedding(text, ai);
```

**要約プロンプトの工夫：**

- 定型表現を禁止（「どのような場面で」など）
- 汎用的な表現を禁止（「〜なアプリ」など）
- 各記事の独自性を強調する具体的な記述を指示

これにより、**意味が凝縮され、検索精度が向上**する（理論的には）。

### 2.3 クエリ拡張による検索精度向上

**問題：短文クエリの検索精度が低い**

「目覚まし」と検索しても、「目覚まし時計」「アラーム」「起床アプリ」などもヒットしてほしい。

**解決策：クエリ拡張**

```typescript
// 短文クエリ（15文字以下）を意味拡張
if (query.length <= 15) {
  const expandedQuery = await expandQuery(query, ai);
}
```

**実装：**
- LLM（`@cf/meta/llama-3.1-8b-instruct`）でクエリを拡張
- 関連技術用語や同義語を自動追加
- 拡張されたクエリでEmbedding生成

**例：**
- `"目覚まし"` → `"目覚まし時計 アラーム 起床 アプリ"`

### 2.4 エッジファーストアーキテクチャ

**なぜCloudflare Workersなのか？**

- **低レイテンシー**: エッジネットワークで実行されるため、世界中どこからでも高速
- **無料枠**: 個人開発プロジェクトには十分な無料枠
- **自動スケーリング**: サーバーレスで運用負荷ゼロ

**システム構成：**

```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│   Cloudflare Workers (Edge)        │
│   Next.js 16 (Frontend)            │
│   - @opennextjs/cloudflare         │
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

※ 単に使ってみたかった。

**コスト：**
- **月額0円**（無料枠内で運用）
- データ収集は日次1回のみ
- 検索はオンデマンド

Cloudflareは無料で公開アプリが作れて素晴らしい。  
AWSだと月額数千円かかるのではないだろうか。

### 2.5 精度向上の取り組み

**問題：類似度70%超えが大量発生**

どのキーワードで検索しても全記事が類似度70%以上でヒットする。  
人類は結局、同じクソを繰り返していた。

**原因の推測：**
1. 要約プロンプトに定型表現が含まれていた（「どのような場面で」など）
2. エンベディング生成時のテキスト構造が不適切（タイトル優先で要約が埋もれた）
3. 要約が長すぎて汎用的な表現が混入

**解決への道のり：**

以下の改善を実施：

1. **要約プロンプトの改善**
   - 定型表現を禁止
   - 各記事の独自性を強調
   - 「クソアプリ」という単語を要約から除外（全ての記事に共通するため）

2. **エンベディング生成時のテキスト構造の改善**
   - 変更前: `${title} ${tags} ${summary}`（タイトル優先）
   - 変更後: `${summary} ${title} ${tags}`（要約優先）

3. **類似度閾値の調整**
   - 0.5 → 0.65に引き上げ（より関連性の高い結果のみ表示）

4. **v2インデックスの作成**
   - 既存インデックスは保持し、新しいインデックスで評価
   - A/Bテスト的なアプローチ

**結果：**
検索精度が向上（したかどうかはよく分からない）。  
なぜこうなるのか、今も原因は分かっていない。

## 3. 実際に使ってみて

**効果は絶大でした**

どんなに革新的なクソアプリのアイデアを検索しても、類似アプリが20件ヒットする。  
「オレのアイデアは量産型クソ」感を味わえるクソアプリ。    

## 4. まとめ

世界初のクソアプリ検索エンジン「kusoogle」  
類似0件を達成するとお祝いメッセージが表示される仕様にした。 これが表示される奇跡のクソアプリが誕生することを願っている。

**🔗 公開中のWEBアプリ：**  
[kusoogle](https://kusoogle.muscle-hustle.workers.dev/)

**📚 ソースコード：**  
[muscle-hustle/kusoogle](https://github.com/muscle-hustle/kusoogle)

## 参考資料

### 技術ドキュメント
- [開発資料](https://github.com/muscle-hustle/kusoogle/tree/main/docs/guides)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [Cloudflare AI Workers Documentation](https://developers.cloudflare.com/workers-ai/)
- [Next.js Documentation](https://nextjs.org/docs)

### 関連記事
- [クソアプリアドベントカレンダー2025](https://qiita.com/advent-calendar/2025/kuso-app)
- [Qiita API v2 Documentation](https://qiita.com/api/v2/docs)

