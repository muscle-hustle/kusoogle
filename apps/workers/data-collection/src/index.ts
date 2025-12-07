import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import type { Env } from './types/env';
import { initializeHandler } from './handlers/initialize';
import { scheduledHandler } from './handlers/scheduled';

/**
 * Honoアプリの初期化
 */
const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use('/*', cors({
    origin: '*', // 本番環境では適切なオリジンを設定
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
}));

// ヘルスチェックエンドポイント
app.get('/health', (c: Context<{ Bindings: Env }>) => {
    return c.json({ status: 'ok' });
});

// 初期データ取得エンドポイント
app.post('/initialize', initializeHandler);

// Cloudflare Workers の export default
// Hono アプリの fetch ハンドラーと Cron Trigger の scheduled ハンドラーを統合
export default {
    scheduled: scheduledHandler,
    fetch: app.fetch,
};
