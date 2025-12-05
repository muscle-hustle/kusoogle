import type { VectorizeIndex } from '@cloudflare/workers-types';
import type { QiitaArticle } from '../types/qiita';
import type { VectorizeArticle } from '@kusoogle/shared';
import { generateEmbedding } from './embedding';

/**
 * 記事をVectorizeに保存
 * @param article Qiita記事
 * @param embedding Embeddingベクトル
 * @param vectorizeIndex Vectorizeインデックス
 */
export async function saveToVectorize(
  article: QiitaArticle,
  embedding: number[],
  vectorizeIndex: VectorizeIndex
): Promise<void> {
  const vectorizeArticle: VectorizeArticle = {
    id: article.id,
    values: embedding,
    metadata: {
      title: article.title,
      url: article.url,
      tags: article.tags.map(t => t.name),
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      author: article.user.id,
      likesCount: article.likes_count,
    },
  };
  
  await vectorizeIndex.insert([vectorizeArticle]);
}

/**
 * Vectorizeから既存の記事データを取得
 * @param vectorizeIndex Vectorizeインデックス
 * @returns 既存記事の配列（IDとmetadataのみ）
 */
export async function getExistingArticles(
  vectorizeIndex: VectorizeIndex
): Promise<Array<{ id: string; metadata: VectorizeArticle['metadata'] }>> {
  // Vectorizeから全記事を取得する方法は限られているため、
  // 実際の実装では、記事IDのリストを別途管理するか、
  // 検索で取得する必要がある
  // ここでは、空の配列を返す（実装は後で改善）
  // TODO: 既存記事の取得方法を実装
  return [];
}

/**
 * 記事を処理（Embedding化してVectorizeに保存）
 * @param article Qiita記事
 * @param env 環境変数
 */
export async function processArticle(
  article: QiitaArticle,
  env: { VECTORIZE_INDEX: VectorizeIndex; AI: any }
): Promise<void> {
  // Embedding化
  const embedding = await generateEmbedding(article, env.AI);
  
  // Vectorizeに保存
  await saveToVectorize(article, embedding, env.VECTORIZE_INDEX);
}

