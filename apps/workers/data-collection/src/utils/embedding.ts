import type { Ai } from '@cloudflare/workers-types';
import type { QiitaArticle } from '../types/qiita';
import { formatTagsForEmbedding } from '@kusoogle/shared';

/**
 * 記事をEmbedding化
 * 記事本文はEmbedding生成にのみ使用し、保存しない（Qiita利用規約遵守のため）
 * @param article Qiita記事
 * @param ai AI Workersバインディング
 * @returns Embeddingベクトル（768次元）
 */
export async function generateEmbedding(
  article: QiitaArticle,
  ai: Ai
): Promise<number[]> {
  // タイトル + タグ + 本文でEmbedding生成
  const tagsText = formatTagsForEmbedding(
    article.tags.map(t => t.name)
  );
  const text = `${article.title}\n${tagsText}\n${article.body}`;

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

