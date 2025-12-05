/**
 * 検索クエリのバリデーション
 * @param query 検索クエリ
 * @returns バリデーション結果（true: 有効、false: 無効）
 */
export function validateSearchQuery(query: string): boolean {
  // 1文字以上500文字以下
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return false;
  }
  return true;
}

/**
 * 検索クエリのサニタイズ（XSS対策）
 * @param query 検索クエリ
 * @returns サニタイズ済みのクエリ
 */
export function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>]/g, '') // HTMLタグを除去
    .trim();
}

/**
 * 検索クエリのバリデーションエラーメッセージを取得
 * @param query 検索クエリ
 * @returns エラーメッセージ（エラーがない場合はnull）
 */
export function getValidationError(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return '検索クエリを入力してください';
  }
  if (trimmed.length > 500) {
    return '検索クエリは500文字以内で入力してください';
  }
  return null;
}

