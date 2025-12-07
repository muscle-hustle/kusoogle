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

  // upsertを使用することで、既存のIDがある場合は上書き、存在しない場合は挿入される
  await vectorizeIndex.upsert([vectorizeArticle]);
}

/**
 * Vectorizeから既存の記事データを取得（IDで検索）
 * 
 * 注意: この関数は現在実装されていません。
 * 
 * 理由:
 * - VectorizeにはIDで直接取得するAPIがない
 * - ダミーベクトルでqueryしてIDでフィルタリングする方法は非効率
 *   （記事数が多い場合、パフォーマンスの問題が発生する可能性）
 * 
 * 将来的な改善案:
 * 1. Cloudflare KVで記事IDと更新日時のマッピングを管理
 *    - より高速な取得が可能
 *    - 追加のリソース（KV）が必要
 *    - 実装例:
 *      ```typescript
 *      // KVに保存: key = articleId, value = updatedAt
 *      await env.ARTICLE_METADATA_KV.put(articleId, updatedAt);
 *      // KVから取得
 *      const existingUpdatedAt = await env.ARTICLE_METADATA_KV.get(articleId);
 *      ```
 * 
 * 2. VectorizeのAPI改善を待つ
 *    - IDで直接取得するAPIが追加される可能性
 * 
 * 3. バッチ処理で既存記事を一度に取得
 *    - VectorizeのAPI制限により難しい可能性
 * 
 * @param vectorizeIndex Vectorizeインデックス
 * @param articleId 記事ID
 * @returns 既存記事のメタデータ、存在しない場合はnull
 */
export async function getExistingArticle(
  vectorizeIndex: VectorizeIndex,
  articleId: string
): Promise<{ id: string; metadata: VectorizeArticle['metadata'] } | null> {
  // 現在は実装されていません（非効率なため）
  // 将来的にはCloudflare KVを使用した実装を検討
  return null;
}

/**
 * 記事を処理（Embedding化してVectorizeに保存）
 * 
 * 注意: 現在は既存記事の更新判定を行っていません。
 * 
 * 理由:
 * - Vectorizeから既存記事を取得する方法が非効率なため
 * - 記事数が多い場合、パフォーマンスの問題が発生する可能性
 * 
 * 将来的な改善案:
 * - Cloudflare KVで記事IDと更新日時のマッピングを管理し、
 *   更新判定を行うことで、リソース（AI Workers、Vectorize書き込み）を節約
 * - 実装例:
 *   ```typescript
 *   // KVから既存記事の更新日時を取得
 *   const existingUpdatedAt = await env.ARTICLE_METADATA_KV.get(article.id);
 *   if (existingUpdatedAt && new Date(article.updated_at) <= new Date(existingUpdatedAt)) {
 *     // 更新がない場合はスキップ
 *     return false;
 *   }
 *   // 処理を実行
 *   // ...
 *   // KVに更新日時を保存
 *   await env.ARTICLE_METADATA_KV.put(article.id, article.updated_at);
 *   ```
 * 
 * @param article Qiita記事
 * @param env 環境変数
 */
export async function processArticle(
  article: QiitaArticle,
  env: { VECTORIZE_INDEX: VectorizeIndex; AI: any }
): Promise<void> {
  // Embedding化
  const embedding = await generateEmbedding(article, env.AI);

  // Vectorizeに保存（upsertにより既存のIDがある場合は上書き、存在しない場合は挿入される）
  await saveToVectorize(article, embedding, env.VECTORIZE_INDEX);
}

