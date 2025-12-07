/**
 * 初期データ取得スクリプト
 * 全てのカレンダー（autoUpdate: true/false問わず）の記事を全件取得してVectorizeに保存
 * 
 * 注意: autoUpdate: trueのカレンダーも初期データとして取得します。
 * これにより、最初のcron実行を待たずにデータを利用できます。
 * 
 * 使用方法:
 *   bun run scripts/initialize-data.ts
 */

import { loadCalendarConfig } from '../packages/shared/src';
import { fetchAllQiitaArticles } from '../apps/workers/data-collection/src/utils/qiita';
import { processArticle } from '../apps/workers/data-collection/src/utils/vectorize';

// ローカル開発環境用のEnv型（実際のCloudflare Workers環境とは異なる）
interface LocalEnv {
    VECTORIZE_INDEX: any; // ローカル開発時はモックまたは実際のVectorizeインデックス
    AI: any; // ローカル開発時はモックまたは実際のAI Workers
    QIITA_ACCESS_TOKEN?: string; // Qiita APIアクセストークン（オプショナル）
}

/**
 * 初期データ取得処理
 * @param env 環境変数（VECTORIZE_INDEX, AI, QIITA_ACCESS_TOKEN）
 */
async function initializeData(env: LocalEnv): Promise<void> {
    try {
        // 1. 設定ファイルを読み込み
        const config = await loadCalendarConfig();

        // 2. 全てのカレンダーを全件取得（autoUpdate: true/false問わず）
        // autoUpdate: trueのカレンダーも初期データとして取得することで、
        // 最初のcron実行を待たずにデータを利用できます
        const allCalendars = config;

        console.log(`${allCalendars.length}個のカレンダーを処理します`);

        for (const calendar of allCalendars) {
            console.log(`カレンダーを処理中: ${calendar.id} (${calendar.url})`);

            try {
                // 2-1. カレンダーページのHTMLから記事を取得
                // fetchAllQiitaArticlesはカレンダーURLを受け取り、HTMLを解析して記事IDを抽出し、
                // Qiita APIで各記事の詳細を取得する
                // アクセストークンが設定されている場合は認証付きリクエスト
                const articles = await fetchAllQiitaArticles(calendar.url, env.QIITA_ACCESS_TOKEN);
                console.log(`  ${articles.length}件の記事を取得しました`);

                // 2-3. 各記事を処理
                for (let i = 0; i < articles.length; i++) {
                    const article = articles[i];
                    try {
                        await processArticle(article, env);
                        if ((i + 1) % 10 === 0) {
                            console.log(`  ${i + 1}/${articles.length}件の記事を処理しました`);
                        }
                    } catch (error) {
                        console.error(`  記事の処理に失敗しました: ${article.id}`, error);
                        // エラーが発生しても次の記事の処理を続行
                    }
                }

                console.log(`カレンダー ${calendar.id} の処理が完了しました`);
            } catch (error) {
                console.error(`カレンダー ${calendar.id} の処理に失敗しました:`, error);
                // エラーが発生しても次のカレンダーの処理を続行
            }

            // レート制限を遵守（リクエスト間に間隔を設ける）
            // 認証時と非認証時で待機時間が異なる
            // 最後のカレンダーの場合は待機しない
            if (allCalendars.indexOf(calendar) < allCalendars.length - 1) {
                const waitTime = env.QIITA_ACCESS_TOKEN ? 3600 : 60000; // 認証時は短い間隔、非認証時は長い間隔
                const waitTimeSeconds = Math.ceil(waitTime / 1000);
                console.log(`レート制限を遵守するため、${waitTimeSeconds}秒待機します...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        console.log('初期データ取得が完了しました');
    } catch (error) {
        console.error('初期データ取得に失敗しました:', error);
        throw error;
    }
}

// スクリプトが直接実行された場合
if (import.meta.main) {
    console.log('初期データ取得スクリプト');
    console.log('');
    console.log('このスクリプトは、Data Collection Workerの/initializeエンドポイント経由で実行されます。');
    console.log('');
    console.log('実行方法:');
    console.log('  1. Data Collection Workerを起動: bun run dev:data-collection');
    console.log('  2. 初期データ取得を実行: curl -X POST http://localhost:8787/initialize');
    console.log('');
    console.log('または、本番環境にデプロイ後:');
    console.log('  curl -X POST https://your-worker.your-subdomain.workers.dev/initialize');
    console.log('');
    process.exit(0);
}

export { initializeData };

