'use server';

import type { SearchRequest, SearchResponse } from '@kusoogle/shared';
import { searchQuerySchema, getValidationErrorMessage } from '@kusoogle/shared';

/**
 * 検索API WorkerのURL
 * 環境変数から取得、デフォルトはlocalhost:8787
 */
const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:8787';

/**
 * 検索Server Action
 * Search API Workerにリクエストを送信し、検索結果を返す
 */
export async function searchArticles(query: string): Promise<SearchResponse> {
    // バリデーション（Zodスキーマを使用）
    const parseResult = searchQuerySchema.safeParse(query);
    if (!parseResult.success) {
        const errorMessage = getValidationErrorMessage(parseResult, '検索クエリのバリデーションに失敗しました');
        throw new Error(errorMessage || '検索クエリのバリデーションに失敗しました');
    }
    const sanitizedQuery = parseResult.data;

    // リクエストボディ
    const requestBody: SearchRequest = {
        query: sanitizedQuery,
    };

    try {
        // Search API Workerにリクエストを送信
        const response = await fetch(`${SEARCH_API_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        // レスポンスのチェック
        if (!response.ok) {
            let errorMessage = `検索に失敗しました (${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.details || errorMessage;
            } catch {
                // JSONパースに失敗した場合は、ステータステキストを使用
                errorMessage = `${errorMessage}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        // レスポンスをパース
        const data: SearchResponse = await response.json();

        // バリデーション（型チェック）
        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('検索結果の形式が正しくありません');
        }

        return data;
    } catch (error) {
        // エラーハンドリング
        if (error instanceof TypeError && error.message.includes('fetch')) {
            // ネットワークエラー（Search API Workerが起動していない可能性）
            throw new Error('検索サーバーに接続できません。Search API Workerが起動しているか確認してください。');
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('検索中に予期しないエラーが発生しました');
    }
}

