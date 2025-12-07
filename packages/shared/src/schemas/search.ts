import { z } from 'zod';
import { sanitizeQuery } from '../utils/validation';

/**
 * 検索クエリ文字列のZodスキーマ
 * クライアント側やServer Actionで文字列のみをバリデーションする際に使用
 */
export const searchQuerySchema = z.string()
    .min(1, '検索クエリを入力してください')
    .max(500, '検索クエリは500文字以内で入力してください')
    .transform((val: string) => sanitizeQuery(val));

/**
 * 検索リクエストのZodスキーマ
 * APIリクエストボディのバリデーションに使用
 */
export const searchRequestSchema = z.object({
    query: searchQuerySchema,
});

/**
 * ZodのSafeParseResultからエラーメッセージを取得するヘルパー関数
 * @param result ZodのSafeParseResult
 * @param fallbackMessage エラーがない場合や取得できない場合のフォールバックメッセージ
 * @returns エラーメッセージ（成功時はnull）
 */
export function getValidationErrorMessage<T>(
    result: z.SafeParseReturnType<T, T>,
    fallbackMessage = 'バリデーションに失敗しました'
): string | null {
    if (result.success) {
        return null;
    }
    return result.error.errors[0]?.message || fallbackMessage;
}

