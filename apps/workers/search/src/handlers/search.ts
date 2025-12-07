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

    // 型定義の問題を回避するため、any型を使用
    const resultData = (result as any).data;
    if (!resultData || resultData.length === 0) {
        throw new Error('Embedding生成に失敗しました');
    }

    return resultData[0];
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
        // zValidatorミドルウェアでバリデーション済み
        const body = (c.req as any).valid('json');
        const { query } = body;

        // クエリをEmbedding化
        let queryEmbedding: number[];
        try {
            // AI Workersバインディングが利用可能か確認
            if (!c.env.AI) {
                throw new Error('AI Workersバインディングが設定されていません。wrangler.tomlを確認してください。');
            }
            queryEmbedding = await generateQueryEmbedding(query, c.env.AI);
        } catch (error) {
            console.error('Embedding生成エラー:', error);

            // エラーコード1031の場合は、開発環境での設定問題を示す
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isError1031 = errorMessage.includes('1031') || errorMessage.includes('error code: 1031');

            return c.json(
                {
                    error: ErrorType.AI_ERROR,
                    message: '検索クエリの処理に失敗しました',
                    details: errorMessage,
                    ...(isError1031 && {
                        hint: '開発環境でAI Workersを使用するには、Cloudflareアカウントにログインしている必要があります。`wrangler login`を実行してください。',
                    }),
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

            // デバッグ用: 検索結果の類似度スコアをログに出力
            console.log(`検索結果: ${vectorizeResults.length}件`);
            vectorizeResults.forEach((result, index) => {
                console.log(`  ${index + 1}. ID: ${result.id}, 類似度: ${result.score?.toFixed(4) || 'N/A'}, タイトル: ${result.metadata?.title || 'N/A'}`);
            });
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

        // 類似度の閾値でフィルタリング（低い類似度の結果を除外）
        // 注意: データが少ない場合（1件のみなど）、この閾値により結果が空になる可能性があります
        // 閾値は調整可能（0.0-1.0の範囲、コサイン類似度）
        const SIMILARITY_THRESHOLD = 0.5; // 設定値未満の類似度は除外
        const filteredResults = vectorizeResults.filter((result) => {
            const score = result.score || 0;
            return score >= SIMILARITY_THRESHOLD;
        });

        console.log(`類似度フィルタリング後: ${filteredResults.length}件 (閾値: ${SIMILARITY_THRESHOLD})`);

        // 結果を整形
        const results = formatSearchResults(filteredResults);

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

