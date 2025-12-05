import type { ScheduledEvent } from '@cloudflare/workers-types';
import type { Env } from './types/env';
import { loadCalendarConfig, getAutoUpdateCalendars } from '@kusoogle/shared';
import { fetchAllQiitaArticles } from './utils/qiita';
import { processArticle } from './utils/vectorize';

/**
 * Cron Triggerハンドラー
 * 日次更新処理（autoUpdate: trueのカレンダーのみ）
 */
export default {
    async scheduled(
        event: ScheduledEvent,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        try {
            // 1. 設定ファイルを読み込み
            // Cloudflare Workers環境では、設定ファイルを環境変数から読み込む
            // 環境変数CALENDARS_CONFIGに設定ファイルのJSON文字列を設定する
            // または、Workerのアセットとして含める場合は、fetchで取得する
            let config;
            if (env.CALENDARS_CONFIG) {
                // 環境変数から読み込む
                config = await loadCalendarConfig(env.CALENDARS_CONFIG);
            } else {
                // デフォルトの設定（開発用）
                config = await loadCalendarConfig(JSON.stringify({
                    calendars: [
                        {
                            id: '2025-01',
                            url: 'https://qiita.com/advent-calendar/2025/kuso-app',
                            year: 2025,
                            autoUpdate: true,
                        },
                        {
                            id: '2024-01',
                            url: 'https://qiita.com/advent-calendar/2024/kuso-app',
                            year: 2024,
                            autoUpdate: true,
                        },
                    ],
                }));
            }

            // 2. 自動更新対象のカレンダーのみ取得（autoUpdate: true）
            const autoUpdateCalendars = getAutoUpdateCalendars(config);

            for (const calendar of autoUpdateCalendars) {
                // 2-1. カレンダーページのHTMLから記事を取得
                // fetchAllQiitaArticlesはカレンダーURLを受け取り、HTMLを解析して記事IDを抽出し、
                // Qiita APIで各記事の詳細を取得する
                // アクセストークンが設定されている場合は認証付きリクエスト
                const articles = await fetchAllQiitaArticles(calendar.url, env.QIITA_ACCESS_TOKEN);

                // 2-3. 各記事を処理
                // TODO: 既存記事のチェックと更新判定を実装
                // 現在はすべての記事を処理（後で最適化）
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
    },
};

