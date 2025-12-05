import type { VectorizeIndex } from '@cloudflare/workers-types';
import type { Ai } from '@cloudflare/workers-types';

/**
 * Cloudflare Workersの環境変数型
 */
export interface Env {
  VECTORIZE_INDEX: VectorizeIndex;
  AI: Ai;
  ENVIRONMENT?: string;
  CALENDARS_CONFIG?: string; // 設定ファイルのJSON文字列
  QIITA_ACCESS_TOKEN?: string; // Qiita APIアクセストークン（認証時はレート制限が緩和される）
}

