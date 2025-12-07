import type { QiitaArticle } from '../types/qiita';

const QIITA_API_BASE = 'https://qiita.com/api/v2';
const RATE_LIMIT_PER_HOUR_UNAUTHENTICATED = 60; // 認証なしのレート制限
const RATE_LIMIT_PER_HOUR_AUTHENTICATED = 1000; // 認証ありのレート制限

/**
 * リクエスト間の待機時間を管理
 */
let lastRequestTime = 0;
let currentRateLimitPerHour = RATE_LIMIT_PER_HOUR_UNAUTHENTICATED;

/**
 * レート制限を遵守するために待機
 * @param accessToken アクセストークン（認証時）
 */
async function waitForRateLimit(accessToken?: string): Promise<void> {
    // アクセストークンに基づいてレート制限を設定
    const rateLimit = accessToken
        ? RATE_LIMIT_PER_HOUR_AUTHENTICATED
        : RATE_LIMIT_PER_HOUR_UNAUTHENTICATED;

    currentRateLimitPerHour = rateLimit;
    const minRequestIntervalMs = (60 * 60 * 1000) / rateLimit;

    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < minRequestIntervalMs) {
        const waitTime = minRequestIntervalMs - elapsed;
        console.log(`[${new Date().toISOString()}] レート制限待機: ${Math.ceil(waitTime)}ms (レート制限: ${rateLimit}/時間)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
        console.log(`[${new Date().toISOString()}] レート制限待機不要 (経過時間: ${elapsed}ms, 最小間隔: ${minRequestIntervalMs}ms)`);
    }

    lastRequestTime = Date.now();
}

/**
 * Qiita APIリクエスト用のヘッダーを生成
 * @param accessToken アクセストークン（認証時）
 * @returns リクエストヘッダー
 */
function getQiitaHeaders(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
}

/**
 * 指数バックオフでリトライ
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[${new Date().toISOString()}] リトライ試行 ${i + 1}/${maxRetries}`);
            const result = await fn();
            console.log(`[${new Date().toISOString()}] リトライ成功 (試行 ${i + 1}/${maxRetries})`);
            return result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[${new Date().toISOString()}] リトライ失敗 (試行 ${i + 1}/${maxRetries}):`, error);

            // 429エラー（レート制限超過）の場合は長めに待機
            if (error instanceof Response && error.status === 429) {
                const retryAfter = error.headers.get('Retry-After');
                const waitTime = retryAfter
                    ? parseInt(retryAfter, 10) * 1000
                    : baseDelay * Math.pow(2, i) * 2; // レート制限の場合は2倍の待機時間
                console.log(`[${new Date().toISOString()}] レート制限超過、${waitTime}ms待機...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // その他のエラーは指数バックオフ
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                console.log(`[${new Date().toISOString()}] リトライ ${i + 1}/${maxRetries} を ${delay}ms 後に実行します...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[${new Date().toISOString()}] 全リトライ失敗`);
    throw lastError || new Error('リトライに失敗しました');
}

/**
 * カレンダーページのHTMLから記事IDを抽出
 * @param htmlContent カレンダーページのHTML文字列
 * @returns 記事IDの配列（重複除去済み）
 */
export function extractArticleIdsFromHTML(htmlContent: string): string[] {
    const articleIds = new Set<string>();

    // Qiitaの記事URLパターンを抽出
    // 例: https://qiita.com/{user_id}/items/{article_id}
    // または: /{user_id}/items/{article_id}
    const urlPatterns = [
        /https?:\/\/qiita\.com\/[^\/]+\/items\/([a-f0-9]+)/g,
        /href=["']\/[^\/]+\/items\/([a-f0-9]+)/g,
        /\/[^\/]+\/items\/([a-f0-9]+)/g,
    ];

    for (const pattern of urlPatterns) {
        let match;
        while ((match = pattern.exec(htmlContent)) !== null) {
            if (match[1]) {
                articleIds.add(match[1]);
            }
        }
    }

    return Array.from(articleIds);
}

/**
 * Qiita APIから記事の詳細を取得
 * @param articleId 記事ID
 * @param accessToken アクセストークン（認証時）
 * @returns 記事データ
 */
export async function fetchArticleById(articleId: string, accessToken?: string): Promise<QiitaArticle> {
    console.log(`[${new Date().toISOString()}] fetchArticleById開始: ${articleId} (認証: ${accessToken ? 'あり' : 'なし'})`);
    await waitForRateLimit(accessToken);
    console.log(`[${new Date().toISOString()}] レート制限待機完了: ${articleId}`);

    const url = `${QIITA_API_BASE}/items/${articleId}`;
    console.log(`[${new Date().toISOString()}] Qiita APIリクエスト開始: ${url}`);

    const response = await retryWithBackoff(async () => {
        console.log(`[${new Date().toISOString()}] fetch実行中: ${articleId}`);
        const res = await fetch(url, {
            headers: getQiitaHeaders(accessToken),
        });

        console.log(`[${new Date().toISOString()}] fetchレスポンス受信: ${articleId} (status: ${res.status})`);

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[${new Date().toISOString()}] Qiita APIエラー: ${articleId} (status: ${res.status}, body: ${errorText.substring(0, 200)})`);
            throw res;
        }

        return res;
    });

    console.log(`[${new Date().toISOString()}] JSONパース開始: ${articleId}`);
    const article = await response.json() as QiitaArticle;
    console.log(`[${new Date().toISOString()}] JSONパース完了: ${articleId} (title: ${article.title?.substring(0, 50) || 'N/A'})`);

    return article;
}

/**
 * カレンダーページのHTMLから記事を取得
 * @param calendarUrl カレンダーURL
 * @param accessToken アクセストークン（認証時）
 * @returns 記事の配列
 */
async function fetchArticlesFromCalendarPage(calendarUrl: string, accessToken?: string): Promise<QiitaArticle[]> {
    // カレンダーページのHTMLを取得（HTML取得は認証不要）
    console.log(`[${new Date().toISOString()}] カレンダーページのHTMLを取得開始: ${calendarUrl}`);
    await waitForRateLimit(accessToken);

    const htmlResponse = await retryWithBackoff(async () => {
        const res = await fetch(calendarUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; KusoogleBot/1.0; +https://kusoogle.example.com)',
            },
        });

        if (!res.ok) {
            throw res;
        }

        return res;
    });

    const htmlContent = await htmlResponse.text();
    console.log(`[${new Date().toISOString()}] カレンダーページのHTML取得完了 (${htmlContent.length} bytes)`);

    // HTMLから記事IDを抽出
    console.log(`[${new Date().toISOString()}] HTMLから記事IDを抽出中...`);
    const articleIds = extractArticleIdsFromHTML(htmlContent);
    console.log(`[${new Date().toISOString()}] 記事ID抽出完了: ${articleIds.length}件`);

    if (articleIds.length === 0) {
        console.warn(`[${new Date().toISOString()}] カレンダーページから記事IDを抽出できませんでした: ${calendarUrl}`);
        return [];
    }

    // 各記事の詳細をQiita APIから取得
    console.log(`[${new Date().toISOString()}] 各記事の詳細をQiita APIから取得開始 (${articleIds.length}件)...`);
    const articles: QiitaArticle[] = [];

    for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        try {
            console.log(`[${new Date().toISOString()}] 記事 ${i + 1}/${articleIds.length} を取得中: ${articleId}`);
            const article = await fetchArticleById(articleId, accessToken);
            articles.push(article);
            console.log(`[${new Date().toISOString()}] 記事 ${i + 1}/${articleIds.length} 取得完了: ${articleId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] 記事の取得に失敗しました: ${articleId}`, error);
            // エラーが発生しても次の記事の取得を続行
        }
    }

    console.log(`[${new Date().toISOString()}] 全記事の取得完了: ${articles.length}/${articleIds.length}件`);
    return articles;
}

/**
 * カレンダーページのHTMLから記事IDリストを取得（記事詳細は取得しない）
 * タイムアウトを避けるため、記事IDリストのみを取得する
 * 
 * @param calendarUrl カレンダーURL（例: "https://qiita.com/advent-calendar/2025/kuso-app"）
 * @returns 記事IDの配列
 */
export async function fetchArticleIdsFromCalendar(
    calendarUrl: string
): Promise<string[]> {
    console.log(`[${new Date().toISOString()}] カレンダーページのHTMLを取得開始: ${calendarUrl}`);

    const htmlResponse = await retryWithBackoff(async () => {
        const res = await fetch(calendarUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; KusoogleBot/1.0; +https://kusoogle.example.com)',
            },
        });

        if (!res.ok) {
            throw res;
        }

        return res;
    });

    const htmlContent = await htmlResponse.text();
    console.log(`[${new Date().toISOString()}] カレンダーページのHTML取得完了 (${htmlContent.length} bytes)`);

    // HTMLから記事IDを抽出
    console.log(`[${new Date().toISOString()}] HTMLから記事IDを抽出中...`);
    const articleIds = extractArticleIdsFromHTML(htmlContent);
    console.log(`[${new Date().toISOString()}] 記事ID抽出完了: ${articleIds.length}件`);

    return articleIds;
}

/**
 * カレンダーページのHTMLから記事を取得
 * 
 * 注意: Qiita APIにはadvent_calendarsエンドポイントが存在しません。
 * そのため、カレンダーページのHTMLを解析して記事IDを抽出し、
 * その後Qiita APIで各記事の詳細を取得します。
 * 
 * この方法は初期登録時と1日1回の更新時のみ使用されるため、
 * サーバーへの負荷は最小限です。
 * 
 * @param calendarUrl カレンダーURL（例: "https://qiita.com/advent-calendar/2025/kuso-app"）
 * @param accessToken アクセストークン（認証時、オプショナル）
 * @returns 記事の配列
 */
export async function fetchAllQiitaArticles(
    calendarUrl: string,
    accessToken?: string
): Promise<QiitaArticle[]> {
    // カレンダーページのHTMLから記事を取得
    return await fetchArticlesFromCalendarPage(calendarUrl, accessToken);
}

/**
 * URLからカレンダーIDを抽出（RSSフィード方式では不要だが、互換性のため残す）
 * 例: https://qiita.com/advent-calendar/2025/kuso-app → "kuso-app"
 * @param url カレンダーURL
 * @returns カレンダーID
 */
export function extractCalendarId(url: string): string {
    const match = url.match(/advent-calendar\/\d+\/(.+)$/);
    if (!match || !match[1]) {
        throw new Error(`無効なカレンダーURL: ${url}`);
    }
    return match[1];
}

