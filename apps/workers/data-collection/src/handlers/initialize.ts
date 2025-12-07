import type { Context } from 'hono';
import type { Env } from '../types/env';
import { calendarsConfig } from '../config/calendars';
import { fetchArticleIdsFromCalendar, fetchArticleById } from '../utils/qiita';
import { processArticle } from '../utils/vectorize';

/**
 * 初期データ取得処理（1記事を処理）
 * Cloudflare Workersの実行時間制限（30秒）とCPU時間制限（無料プラン10ms）を考慮し、
 * 1記事ずつ処理する
 * @param env 環境変数
 * @param calendarId 処理するカレンダーID
 * @param articleIndex 処理する記事のインデックス（0から開始）
 * @returns 処理結果と次の記事のインデックス（あれば）
 */
export async function initializeData(
    env: Env,
    calendarId?: string,
    articleIndex: number = 0
): Promise<{
    processed: string;
    calendarId: string;
    articleIndex: number;
    nextArticleIndex?: number;
    nextCalendarId?: string;
    completed: boolean;
    totalArticles?: number;
    processedCount?: number;
}> {
    try {
        console.log(`[${new Date().toISOString()}] initializeData処理開始...`);

        // 1. 設定ファイルを読み込み
        const config = calendarsConfig;

        // 2. 全てのカレンダーを取得（autoUpdate: true/false問わず）
        const allCalendars = config;

        // 3. 処理するカレンダーを決定
        let targetCalendarIndex = 0;
        if (calendarId) {
            const index = allCalendars.findIndex(c => c.id === calendarId);
            if (index >= 0) {
                targetCalendarIndex = index;
            }
        }

        const calendar = allCalendars[targetCalendarIndex];
        if (!calendar) {
            return {
                processed: '',
                calendarId: '',
                articleIndex: 0,
                completed: true,
            };
        }

        // 4. カレンダーの記事IDリストを取得（初回のみ、または記事IDリストが取得されていない場合）
        // 注意: 記事リスト取得は時間がかかるため、記事IDリストのみを取得し、
        // 各記事の詳細は1記事ずつ取得する
        console.log(`[${new Date().toISOString()}] カレンダー ${calendar.id} の記事IDリストを取得開始...`);
        console.log(`[${new Date().toISOString()}] アクセストークン: ${env.QIITA_ACCESS_TOKEN ? '設定済み' : '未設定'}`);

        // 記事IDリストを取得（HTML取得のみ、Qiita API呼び出しなし）
        const articleIds = await fetchArticleIdsFromCalendar(calendar.url);
        console.log(`[${new Date().toISOString()}] カレンダー ${calendar.id} の記事IDリスト取得完了: ${articleIds.length}件`);

        if (articleIndex === 0) {
            console.log(`[${new Date().toISOString()}] カレンダーを処理中: ${calendar.id} (${calendar.url})`);
            console.log(`[${new Date().toISOString()}]   ${articleIds.length}件の記事IDを取得しました`);
        }

        // 5. 指定されたインデックスの記事を処理
        if (articleIndex >= articleIds.length) {
            // このカレンダーの処理が完了
            console.log(`[${new Date().toISOString()}] カレンダー ${calendar.id} の処理が完了しました（${articleIds.length}件）`);

            // 次のカレンダーがあるか確認
            const nextIndex = targetCalendarIndex + 1;
            const nextCalendar = allCalendars[nextIndex];

            if (nextCalendar) {
                // 次のカレンダーの最初の記事を処理
                return {
                    processed: calendar.id,
                    calendarId: nextCalendar.id,
                    articleIndex: 0,
                    nextArticleIndex: 0,
                    nextCalendarId: nextCalendar.id,
                    completed: false,
                    totalArticles: articleIds.length,
                    processedCount: articleIds.length,
                };
            } else {
                // 全てのカレンダーの処理が完了
                return {
                    processed: calendar.id,
                    calendarId: calendar.id,
                    articleIndex: articleIds.length,
                    completed: true,
                    totalArticles: articleIds.length,
                    processedCount: articleIds.length,
                };
            }
        }

        // 6. 記事IDから記事の詳細を取得して処理
        const articleId = articleIds[articleIndex];
        console.log(`[${new Date().toISOString()}] 記事 ${articleIndex + 1}/${articleIds.length} の処理開始: ${articleId}`);

        try {
            // 記事の詳細を取得
            const article = await fetchArticleById(articleId, env.QIITA_ACCESS_TOKEN);
            console.log(`[${new Date().toISOString()}] 記事 ${articleIndex + 1}/${articleIds.length} の詳細取得完了: ${articleId} (${article.title})`);

            // 記事を処理
            await processArticle(article, env);
            console.log(`[${new Date().toISOString()}] 記事 ${articleIndex + 1}/${articleIds.length} の処理完了: ${articleId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] 記事の処理に失敗しました: ${articleId}`, error);
            // エラーが発生しても次の記事の処理を続行
        }

        // 7. 次の記事のインデックス
        const nextArticleIndex = articleIndex + 1;

        return {
            processed: articleId,
            calendarId: calendar.id,
            articleIndex: nextArticleIndex,
            nextArticleIndex: nextArticleIndex < articleIds.length ? nextArticleIndex : undefined,
            nextCalendarId: nextArticleIndex >= articleIds.length ? allCalendars[targetCalendarIndex + 1]?.id : undefined,
            completed: false,
            totalArticles: articleIds.length,
            processedCount: nextArticleIndex,
        };
    } catch (error) {
        console.error('初期データ取得に失敗しました:', error);
        throw error;
    }
}

/**
 * 初期データ取得エンドポイントのハンドラー
 */
export async function initializeHandler(c: Context<{ Bindings: Env }>) {
    try {
        // シークレットトークンの検証
        const secret = c.req.header('X-Initialize-Secret');
        const expectedSecret = c.env.INITIALIZE_SECRET;

        // シークレットが設定されている場合は検証
        if (expectedSecret) {
            if (!secret) {
                return c.json({ error: '認証が必要です。X-Initialize-Secretヘッダーを設定してください。' }, 401);
            }

            if (secret !== expectedSecret) {
                return c.json({ error: '認証に失敗しました' }, 401);
            }
        }

        // クエリパラメータからカレンダーIDと記事インデックスを取得
        const calendarId = c.req.query('calendarId') || undefined;
        const articleIndex = parseInt(c.req.query('articleIndex') || '0', 10);

        // 1記事を処理（時間制限を考慮）
        const result = await initializeData(c.env, calendarId, articleIndex);

        // 次の記事またはカレンダーがある場合は、次のリクエストのURLを返す
        const response: {
            message: string;
            processed: string;
            calendarId: string;
            articleIndex: number;
            nextUrl?: string;
            completed: boolean;
            totalArticles?: number;
            processedCount?: number;
        } = {
            message: result.completed
                ? '初期データ取得が完了しました'
                : result.nextArticleIndex !== undefined
                    ? `記事 ${result.processedCount}/${result.totalArticles} を処理しました（カレンダー: ${result.calendarId}）`
                    : `カレンダー ${result.calendarId} の処理が完了しました`,
            processed: result.processed,
            calendarId: result.calendarId,
            articleIndex: result.articleIndex,
            completed: result.completed,
            totalArticles: result.totalArticles,
            processedCount: result.processedCount,
        };

        if (!result.completed) {
            // 次の記事またはカレンダーがある場合
            const url = new URL(c.req.url);
            if (result.nextArticleIndex !== undefined) {
                // 同じカレンダーの次の記事
                response.nextUrl = `${url.origin}/initialize?calendarId=${result.calendarId}&articleIndex=${result.nextArticleIndex}`;
            } else if (result.nextCalendarId) {
                // 次のカレンダーの最初の記事
                response.nextUrl = `${url.origin}/initialize?calendarId=${result.nextCalendarId}&articleIndex=0`;
            }
        }

        return c.json(response);
    } catch (error) {
        return c.json(
            {
                error: '初期データ取得に失敗しました',
                details: error instanceof Error ? error.message : String(error),
            },
            500
        );
    }
}

