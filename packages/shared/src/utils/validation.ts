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


