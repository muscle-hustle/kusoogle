import type { Ai } from '@cloudflare/workers-types';
import type { QiitaArticle } from '../types/qiita';
import { formatTagsForEmbedding, truncate } from '@kusoogle/shared';
import { summarizeArticle } from './text';

/**
 * 記事をEmbedding化
 * 記事本文は要約してからEmbedding生成に使用し、保存しない（Qiita利用規約遵守のため）
 * @param article Qiita記事
 * @param ai AI Workersバインディング
 * @returns Embeddingベクトル（768次元）
 */
export async function generateEmbedding(
  article: QiitaArticle,
  ai: Ai
): Promise<number[]> {
  const tagsText = formatTagsForEmbedding(
    article.tags.map(t => t.name)
  );

  // 要約を生成（失敗した場合は元の本文を使用）
  let text: string;
  try {
    const summary = await summarizeArticle(article.body, ai, 300);
    console.log(`[要約生成成功] 記事ID: ${article.id}, タイトル: ${article.title}`);
    console.log(`[要約内容] ${summary}`);
    // 要約を重視し、タイトルとタグは補助的に使用
    // 要約が主で、タイトルとタグは検索の補助として使用
    // 要約の重みを高くするため、要約を先に配置
    text = `${summary} ${article.title} ${tagsText}`;
  } catch (error) {
    console.error(`要約生成に失敗しました（記事ID: ${article.id}）。元の本文を使用します:`, error);
    // フォールバック: 元の本文を使用（1000文字に切り詰め）
    text = `${truncate(article.body, 1000)} ${article.title} ${tagsText}`;
  }

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: text,
  });

  // 型定義の問題を回避するため、any型を使用
  const resultData = (result as any).data;
  if (!resultData || resultData.length === 0) {
    throw new Error('Embedding生成に失敗しました');
  }

  return resultData[0];
}

