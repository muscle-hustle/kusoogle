import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import type { Env } from './types/env';
import { searchHandler } from './handlers/search';
import { searchRequestSchema } from './schemas/search';

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
app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

// 検索APIエンドポイント（バリデーション付き）
app.post('/api/search', zValidator('json', searchRequestSchema), searchHandler);

export default app;

