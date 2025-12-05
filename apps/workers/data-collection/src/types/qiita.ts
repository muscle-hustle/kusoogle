/**
 * Qiita APIから取得する記事の型
 * Qiita API v2のレスポンス形式に基づく
 */
export interface QiitaArticle {
  id: string;
  title: string;
  url: string;
  body: string; // Embedding生成にのみ使用、保存しない
  tags: Array<{ name: string }>;
  created_at: string; // ISO 8601形式
  updated_at: string; // ISO 8601形式
  user: {
    id: string;
  };
  likes_count: number;
}

/**
 * Qiita APIのページネーション情報
 */
export interface QiitaPagination {
  page: number;
  per_page: number;
  count: number;
}

