import type { Article } from './article';

/**
 * 検索結果
 * Articleを拡張し、類似度スコアを追加
 */
export interface SearchResult extends Article {
  similarity: number; // 類似度スコア（0-1、コサイン類似度）
  // summary: 削除（記事本文の要約は表示しない - Qiita利用規約遵守のため）
}

/**
 * 検索リクエスト
 */
export interface SearchRequest {
  query: string; // 検索クエリ（必須）
}

/**
 * 検索レスポンス
 */
export interface SearchResponse {
  results: SearchResult[];
  query: string;
  timestamp: string; // ISO 8601形式
}

