'use server';

import type { SearchRequest, SearchResponse } from '@kusoogle/shared';
import { searchQuerySchema, getValidationErrorMessage } from '@kusoogle/shared';

/**
 * 検索API WorkerのURLを取得
 * 環境変数から取得、デフォルトはlocalhost:8787（ローカル開発環境）
 * サーバーアクションでもNEXT_PUBLIC_プレフィックス付きの環境変数を使用可能
 */
function getSearchApiUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SEARCH_API_URL ||
        'http://localhost:8787'
    );
}

/**
 * 開発環境かどうかを判定
 */
function isDevelopment(): boolean {
    return (
        process.env.NODE_ENV === 'development' ||
        process.env.ENVIRONMENT === 'development'
    );
}

/**
 * 検索Server Action
 * Search API Workerにリクエストを送信し、検索結果を返す
 */
export async function searchArticles(query: string): Promise<SearchResponse> {
    const isDev = isDevelopment();

    try {
        // 環境変数を動的に取得（実行時に評価されるようにする）
        const SEARCH_API_URL = getSearchApiUrl();

        // 開発環境でのみ詳細ログを出力
        if (isDev) {
            console.log('[searchArticles] Starting search with query:', query);
            console.log('[searchArticles] SEARCH_API_URL:', SEARCH_API_URL);
        }

        // バリデーション（Zodスキーマを使用）
        const parseResult = searchQuerySchema.safeParse(query);
        if (!parseResult.success) {
            const errorMessage = getValidationErrorMessage(parseResult, '検索クエリのバリデーションに失敗しました');
            console.error('[searchArticles] Validation error:', errorMessage);
            throw new Error(errorMessage || '検索クエリのバリデーションに失敗しました');
        }
        const sanitizedQuery = parseResult.data;

        // リクエストボディ
        const requestBody: SearchRequest = {
            query: sanitizedQuery,
        };

        // Search API Workerにリクエストを送信
        const requestUrl = `${SEARCH_API_URL}/api/search`;
        if (isDev) {
            console.log('[searchArticles] Sending request to:', requestUrl);
            console.log('[searchArticles] Request body:', JSON.stringify(requestBody));
        }

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'kusoogle-frontend/1.0.0',
            },
            body: JSON.stringify(requestBody),
        });

        // 開発環境でのみ詳細なレスポンス情報をログ出力
        if (isDev) {
            console.log('[searchArticles] Response status:', response.status);
            console.log('[searchArticles] Response ok:', response.ok);
        }

        // レスポンスのチェック
        if (!response.ok) {
            let errorMessage = `検索に失敗しました (${response.status})`;
            let responseText = '';
            try {
                responseText = await response.text();
                // JSONとしてパースを試みる
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorData.details || errorMessage;
                    console.error('[searchArticles] API error response:', {
                        status: response.status,
                        message: errorMessage,
                        ...(isDev && { responseText, errorData }),
                    });
                } catch {
                    // JSONパースに失敗した場合は、テキストをそのまま使用
                    errorMessage = `${errorMessage}: ${response.statusText || responseText}`;
                    console.error('[searchArticles] API error (non-JSON):', {
                        status: response.status,
                        message: errorMessage,
                        ...(isDev && { responseText }),
                    });
                }
            } catch (textError) {
                // テキスト取得に失敗した場合
                errorMessage = `${errorMessage}: ${response.statusText}`;
                console.error('[searchArticles] Failed to get error response:', {
                    status: response.status,
                    message: errorMessage,
                    ...(isDev && { error: textError }),
                });
            }
            throw new Error(errorMessage);
        }

        // レスポンスをパース
        const data: SearchResponse = await response.json();

        // 成功時は結果数のみログ出力（本番環境でも必要最小限の情報）
        const resultsCount = data.results?.length || 0;
        console.log(`[searchArticles] Search completed: ${resultsCount} results for query: "${query}"`);

        // バリデーション（型チェック）
        if (!data.results || !Array.isArray(data.results)) {
            console.error('[searchArticles] Invalid response format:', data);
            throw new Error('検索結果の形式が正しくありません');
        }

        return data;
    } catch (error) {
        // エラーハンドリング（エラー時は常に詳細ログを出力）
        const isDev = isDevelopment();
        console.error('[searchArticles] Error occurred:', error);
        console.error('[searchArticles] Error message:', error instanceof Error ? error.message : String(error));

        // 開発環境でのみ追加の詳細情報を出力
        if (isDev) {
            console.error('[searchArticles] Error type:', error instanceof Error ? error.constructor.name : typeof error);
            if (error instanceof Error && error.stack) {
                console.error('[searchArticles] Error stack:', error.stack);
            }
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
            // ネットワークエラー（Search API Workerが起動していない可能性）
            const errorMsg = '検索サーバーに接続できません。Search API Workerが起動しているか確認してください。';
            console.error('[searchArticles] Network error:', errorMsg);
            throw new Error(errorMsg);
        }
        if (error instanceof Error) {
            // 既にErrorオブジェクトの場合はそのまま再スロー
            throw error;
        }
        // 予期しないエラー
        const unexpectedError = new Error('検索中に予期しないエラーが発生しました');
        console.error('[searchArticles] Unexpected error:', unexpectedError);
        throw unexpectedError;
    }
}

