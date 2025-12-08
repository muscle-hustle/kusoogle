# Cloudflare AI Workers: 日本語技術記事要約に適したモデル一覧

## 概要

Cloudflare AI Workersで利用可能なモデルの中で、日本語技術記事の要約に適したモデルをリストアップします。

## 推奨モデル（優先順位順）

### 1. Qwenシリーズ（最推奨）

QwenはAlibaba Cloudが開発した多言語対応モデルで、**日本語処理能力が高い**ことで知られています。

#### @cf/qwen/qwen1.5-7b-chat-awq
- **モデル名**: `@cf/qwen/qwen1.5-7b-chat-awq`
- **パラメータ数**: 7B
- **コンテキストウィンドウ**: 20,000 tokens
- **特徴**: 
  - 日本語対応が優秀
  - AWQ量子化により高速
  - 技術記事の理解に適している
- **注意**: Beta版、2025年10月1日に非推奨予定
- **推奨用途**: 日本語技術記事の要約（高精度）

#### @cf/qwen/qwen1.5-14b-chat-awq
- **モデル名**: `@cf/qwen/qwen1.5-14b-chat-awq`
- **パラメータ数**: 14B
- **コンテキストウィンドウ**: 7,500 tokens
- **特徴**: 
  - より高精度な要約が可能
  - 日本語処理能力が高い
- **注意**: Beta版、2025年10月1日に非推奨予定
- **推奨用途**: 高精度な日本語技術記事の要約

#### @cf/qwen/qwq-32b
- **モデル名**: `@cf/qwen/qwq-32b`
- **パラメータ数**: 32B
- **コンテキストウィンドウ**: 24,000 tokens
- **特徴**: 
  - 推論能力が高い
  - 複雑な技術記事の要約に適している
- **注意**: 有料（$0.66 per M input tokens, $1.00 per M output tokens）
- **推奨用途**: 複雑な技術記事の要約（高精度・有料）

### 2. DeepSeekシリーズ

DeepSeekは中国のDeepSeek AIが開発したモデルで、**多言語対応**が優れています。

#### @cf/deepseek-ai/deepseek-r1-distill-qwen-32b
- **モデル名**: `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`
- **特徴**: 
  - Qwenベースの蒸留モデル
  - 推論能力が高い
  - JSON Mode対応
- **推奨用途**: 構造化された要約生成

### 3. Llamaシリーズ（現在使用中）

Metaが開発した多言語対応モデル。現在 `@cf/meta/llama-3.1-8b-instruct` を使用中。

#### @cf/meta/llama-3.1-8b-instruct（現在使用中）
- **モデル名**: `@cf/meta/llama-3.1-8b-instruct`
- **パラメータ数**: 8B
- **特徴**: 
  - 多言語対応（日本語含む）
  - JSON Mode対応
  - 無料枠内で利用可能
- **注意**: 日本語処理能力はQwenより劣る可能性
- **推奨用途**: 汎用的な要約（現在の実装）

#### @cf/meta/llama-3.1-70b-instruct
- **モデル名**: `@cf/meta/llama-3.1-70b-instruct`
- **パラメータ数**: 70B
- **特徴**: 
  - より高精度な要約が可能
  - JSON Mode対応
- **注意**: 処理時間が長い可能性
- **推奨用途**: 高精度な要約が必要な場合

#### @cf/meta/llama-3.3-70b-instruct-fp8-fast
- **モデル名**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **パラメータ数**: 70B（fp8量子化）
- **特徴**: 
  - 高速処理
  - JSON Mode対応
  - Function calling対応
- **推奨用途**: 高速かつ高精度な要約

### 4. 専用Summarizationモデル

#### @cf/facebook/bart-large-cnn
- **モデル名**: `@cf/facebook/bart-large-cnn`
- **特徴**: 
  - 要約専用モデル
  - CNN/DailyMailデータセットで学習
- **注意**: 英語に特化している可能性が高い
- **推奨用途**: 英語記事の要約（日本語には不向き）

## モデル比較表

| モデル | 日本語対応 | 精度 | 速度 | コスト | 推奨度 |
|--------|-----------|------|------|--------|--------|
| @cf/qwen/qwen1.5-7b-chat-awq | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 無料 | ⭐⭐⭐⭐⭐ |
| @cf/qwen/qwen1.5-14b-chat-awq | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 無料 | ⭐⭐⭐⭐⭐ |
| @cf/qwen/qwq-32b | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 有料 | ⭐⭐⭐⭐ |
| @cf/meta/llama-3.1-8b-instruct | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 無料 | ⭐⭐⭐ |
| @cf/meta/llama-3.1-70b-instruct | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | 無料 | ⭐⭐⭐⭐ |
| @cf/meta/llama-3.3-70b-instruct-fp8-fast | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 無料 | ⭐⭐⭐⭐ |
| @cf/deepseek-ai/deepseek-r1-distill-qwen-32b | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 無料 | ⭐⭐⭐⭐ |

## 推奨実装

### 最推奨: Qwen1.5-7b-chat-awq

```typescript
const result = await (ai as any).run('@cf/qwen/qwen1.5-7b-chat-awq', {
  messages: [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: body,
    },
  ],
});
```

**理由**:
- 日本語処理能力が最も高い
- 技術記事の理解に適している
- 無料枠内で利用可能
- 処理速度が速い（AWQ量子化）

### 代替案: Qwen1.5-14b-chat-awq

より高精度が必要な場合：

```typescript
const result = await (ai as any).run('@cf/qwen/qwen1.5-14b-chat-awq', {
  messages: [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: body,
    },
  ],
});
```

**注意**: コンテキストウィンドウが7,500 tokensと小さいため、長文記事には注意が必要

## 注意事項

### 1. Qwenモデルの非推奨予定

- `qwen1.5-7b-chat-awq`: 2025年10月1日に非推奨予定
- `qwen1.5-14b-chat-awq`: 2025年10月1日に非推奨予定

**対策**: 
- 新しいQwenモデルのリリースを待つ
- または、Llama 3.3シリーズへの移行を検討

### 2. コンテキストウィンドウの制限

- 長文記事の場合は、事前にチャンキングが必要な場合がある
- 各モデルのコンテキストウィンドウを確認して使用

### 3. コスト

- ほとんどのモデルは無料枠内で利用可能
- `qwq-32b`は有料（$0.66 per M input tokens, $1.00 per M output tokens）

## 実装例

### 現在の実装（Llama 3.1-8b-instruct）

```typescript
// apps/workers/data-collection/src/utils/text.ts
const result = await (ai as any).run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: body,
    },
  ],
});
```

### 推奨実装（Qwen1.5-7b-chat-awq）

```typescript
// apps/workers/data-collection/src/utils/text.ts
const result = await (ai as any).run('@cf/qwen/qwen1.5-7b-chat-awq', {
  messages: [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: body,
    },
  ],
});
```

## テスト推奨

以下のモデルで実際にテストして、要約品質を比較することを推奨します：

1. **@cf/qwen/qwen1.5-7b-chat-awq**（最推奨）
2. **@cf/qwen/qwen1.5-14b-chat-awq**（高精度）
3. **@cf/meta/llama-3.3-70b-instruct-fp8-fast**（高速・高精度）
4. **@cf/meta/llama-3.1-8b-instruct**（現在使用中、比較用）

## 参考資料

- [Cloudflare Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Qwen Models on Hugging Face](https://huggingface.co/qwen)
- [Cloudflare Workers AI Playground](https://playground.ai.cloudflare.com/)

