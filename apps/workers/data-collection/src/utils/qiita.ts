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
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // 429エラー（レート制限超過）の場合は長めに待機
            if (error instanceof Response && error.status === 429) {
                const retryAfter = error.headers.get('Retry-After');
                const waitTime = retryAfter
                    ? parseInt(retryAfter, 10) * 1000
                    : baseDelay * Math.pow(2, i) * 2; // レート制限の場合は2倍の待機時間
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // その他のエラーは指数バックオフ
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('リトライに失敗しました');
}

/**
 * カレンダーページのHTMLから記事IDを抽出
 * @param htmlContent カレンダーページのHTML文字列
 * @returns 記事IDの配列（重複除去済み）
 */
function extractArticleIdsFromHTML(htmlContent: string): string[] {
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
async function fetchArticleById(articleId: string, accessToken?: string): Promise<QiitaArticle> {
    await waitForRateLimit(accessToken);

    const url = `${QIITA_API_BASE}/items/${articleId}`;

    const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
            headers: getQiitaHeaders(accessToken),
        });

        if (!res.ok) {
            throw res;
        }

        return res;
    });

    return await response.json();
}

/**
 * カレンダーページのHTMLから記事を取得
 * @param calendarUrl カレンダーURL
 * @param accessToken アクセストークン（認証時）
 * @returns 記事の配列
 */
async function fetchArticlesFromCalendarPage(calendarUrl: string, accessToken?: string): Promise<QiitaArticle[]> {
    // カレンダーページのHTMLを取得（HTML取得は認証不要）
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

    // HTMLから記事IDを抽出
    const articleIds = extractArticleIdsFromHTML(htmlContent);

    if (articleIds.length === 0) {
        console.warn(`カレンダーページから記事IDを抽出できませんでした: ${calendarUrl}`);
        return [];
    }

    // 各記事の詳細をQiita APIから取得
    const articles: QiitaArticle[] = [];

    for (const articleId of articleIds) {
        try {
            const article = await fetchArticleById(articleId, accessToken);
            articles.push(article);
        } catch (error) {
            console.error(`記事の取得に失敗しました: ${articleId}`, error);
            // エラーが発生しても次の記事の取得を続行
        }
    }

    return articles;
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

