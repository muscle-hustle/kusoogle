import type { ScheduledEvent } from '@cloudflare/workers-types';
import type { Env } from '../types/env';
import { getAutoUpdateCalendars } from '@kusoogle/shared';
import { calendarsConfig } from '../config/calendars';
import { fetchAllQiitaArticles } from '../utils/qiita';
import { processArticle } from '../utils/vectorize';

/**
 * Cron Triggerハンドラー
 * 日次更新処理（autoUpdate: trueのカレンダーのみ）
 */
export async function scheduledHandler(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    try {
        // 1. 設定ファイルを読み込み
        const config = calendarsConfig;

        // 2. 自動更新対象のカレンダーのみ取得（autoUpdate: true）
        const autoUpdateCalendars = getAutoUpdateCalendars(config);

        for (const calendar of autoUpdateCalendars) {
            // 2-1. カレンダーページのHTMLから記事を取得
            // fetchAllQiitaArticlesはカレンダーURLを受け取り、HTMLを解析して記事IDを抽出し、
            // Qiita APIで各記事の詳細を取得する
            // アクセストークンが設定されている場合は認証付きリクエスト
            const articles = await fetchAllQiitaArticles(calendar.url, env.QIITA_ACCESS_TOKEN);

            // 2-2. 各記事を処理
            // 注意: 現在は既存記事の更新判定を行っていません（非効率なため）
            // 将来的にはCloudflare KVを使用した更新判定を実装することで、
            // リソース（AI Workers、Vectorize書き込み）を節約できます
            for (const article of articles) {
                try {
                    await processArticle(article, env);
                } catch (error) {
                    console.error(`記事の処理に失敗しました: ${article.id}`, error);
                    // エラーが発生しても次の記事の処理を続行
                }
            }
        }
    } catch (error) {
        console.error('Cron Triggerの実行に失敗しました:', error);
        throw error;
    }
}

