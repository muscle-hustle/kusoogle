import { z } from 'zod';

/**
 * 検索リクエストのスキーマ
 */
export const searchRequestSchema = z.object({
    query: z.string()
        .min(1, '検索クエリを入力してください')
        .max(500, '検索クエリは500文字以内で入力してください')
        .transform((val) => val.replace(/[<>]/g, '').trim()), // サニタイズ
});

