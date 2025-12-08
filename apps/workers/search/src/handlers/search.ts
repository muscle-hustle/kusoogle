import type { Context } from 'hono';
import type { Env } from '../types/env';
import type { SearchResponse, SearchResult } from '@kusoogle/shared';
import { ErrorType } from '@kusoogle/shared';

/**
 * 検索クエリを拡張・改善する
 * 短文クエリを意味拡張し、検索精度を向上させる
 * @param query 元の検索クエリ
 * @param ai AI Workersバインディング
 * @returns 拡張されたクエリ
 */
async function expandQuery(query: string, ai: Env['AI']): Promise<string> {
    // クエリが短い場合（10文字以下）のみ拡張を試みる
    // 長いクエリは既に十分な情報を含んでいるため、拡張不要
    if (query.length > 15) {
        return query;
    }

    try {
        const systemPrompt = `検索クエリを意味的に拡張してください。
元のクエリの意味を保ちつつ、関連する技術用語や同義語を追加してください。
拡張されたクエリは、元のクエリを含む自然な文章として記述してください。
「アプリ」「ツール」「クソ」「ゲーム」などの汎用的な単語は含めないでください。

例:
- 入力: "目覚まし"
- 出力: "目覚まし時計 アラーム 起床"

- 入力: "タスク管理"
- 出力: "タスク管理 タスクリスト TODO スケジュール管理"

- 入力: "ゲーム"
- 出力: "ゲーム ゲームアプリ 遊び エンターテインメント"

拡張されたクエリは50文字以内で、元のクエリの意味を保持してください。`;

        // 型定義の問題を回避するため、any型を使用
        const result = await (ai as any).run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
        });

        const expandedQuery = (result as any).response;
        if (!expandedQuery || typeof expandedQuery !== 'string') {
            // 拡張に失敗した場合は元のクエリを返す
            return query;
        }

        // 拡張されたクエリが長すぎる場合は切り詰め
        if (expandedQuery.length > 100) {
            return expandedQuery.substring(0, 100);
        }

        console.log(`[クエリ拡張] 元: "${query}" → 拡張: "${expandedQuery}"`);
        return expandedQuery;
    } catch (error) {
        console.error('クエリ拡張に失敗しました。元のクエリを使用します:', error);
        // 拡張に失敗した場合は元のクエリを返す
        return query;
    }
}

/**
 * クエリをEmbedding化
 * @param query 検索クエリ
 * @param ai AI Workersバインディング
 * @returns Embeddingベクトル（768次元）
 */
async function generateQueryEmbedding(query: string, ai: Env['AI']): Promise<number[]> {
    // クエリを拡張（短文クエリの場合）
    const expandedQuery = await expandQuery(query, ai);

    const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
        text: expandedQuery,
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
                topK: 20,
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
        // 要約アプローチでは、共通キーワードが多いため閾値を上げる
        const SIMILARITY_THRESHOLD = 0.80; // 設定値未満の類似度は除外
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

