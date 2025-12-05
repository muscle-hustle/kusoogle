/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * エラー種別
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  VECTORIZE_ERROR = 'VECTORIZE_ERROR',
  AI_ERROR = 'AI_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

