import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { SearchResponse, SearchResult } from '@kusoogle/shared';
import { ErrorType } from '@kusoogle/shared';

/**
 * クエリをEmbedding化
 * @param query 検索クエリ
 * @param ai AI Workersバインディング
 * @returns Embeddingベクトル（768次元）
 */
async function generateQueryEmbedding(query: string, ai: Env['AI']): Promise<number[]> {
    const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
        text: query,
    });

    if (!result.data || result.data.length === 0) {
        throw new Error('Embedding生成に失敗しました');
    }

    return result.data[0];
}

/**
 * Vectorize検索結果をSearchResultに変換
 * @param vectorizeResults Vectorize検索結果
 * @returns SearchResultの配列
 */
function formatSearchResults(vectorizeResults: any[]): SearchResult[] {
    return vectorizeResults.map((result) => {
        const metadata = result.metadata || {};
        return {
            id: result.id || '',
            title: metadata.title || '',
            url: metadata.url || '',
            tags: Array.isArray(metadata.tags) ? metadata.tags : [],
            createdAt: metadata.createdAt || '',
            updatedAt: metadata.updatedAt || '',
            author: metadata.author || '',
            likesCount: metadata.likesCount || 0,
            similarity: result.score || 0,
        };
    });
}

/**
 * 検索APIハンドラー
 * バリデーションはzValidatorミドルウェアで実行済み
 */
export async function searchHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
        // バリデーション済みのリクエストボディを取得
        const { query } = c.req.valid('json');

        // クエリをEmbedding化
        let queryEmbedding: number[];
        try {
            queryEmbedding = await generateQueryEmbedding(query, c.env.AI);
        } catch (error) {
            console.error('Embedding生成エラー:', error);
            return c.json(
                {
                    error: ErrorType.AI_ERROR,
                    message: '検索クエリの処理に失敗しました',
                    details: error instanceof Error ? error.message : String(error),
                },
                500
            );
        }

        // Vectorizeで検索
        let vectorizeResults: any[];
        try {
            const searchResults = await c.env.VECTORIZE_INDEX.query(queryEmbedding, {
                topK: 10,
                returnMetadata: true,
            });
            vectorizeResults = searchResults.matches || [];
        } catch (error) {
            console.error('Vectorize検索エラー:', error);
            return c.json(
                {
                    error: ErrorType.VECTORIZE_ERROR,
                    message: '検索処理に失敗しました',
                    details: error instanceof Error ? error.message : String(error),
                },
                500
            );
        }

        // 結果を整形
        const results = formatSearchResults(vectorizeResults);

        // レスポンスを返却
        const response: SearchResponse = {
            results,
            query,
            timestamp: new Date().toISOString(),
        };

        return c.json(response);
    } catch (error) {
        // 予期しないエラー
        console.error('予期しないエラー:', error);
        return c.json(
            {
                error: ErrorType.UNKNOWN_ERROR,
                message: 'サーバーエラーが発生しました',
                details: error instanceof Error ? error.message : String(error),
            },
            500
        );
    }
}

