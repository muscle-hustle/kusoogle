import type { VectorizeIndex } from '@cloudflare/workers-types';
import type { Ai } from '@cloudflare/workers-types';

/**
 * Cloudflare Workersの環境変数型
 */
export interface Env {
    VECTORIZE_INDEX: VectorizeIndex;
    AI: Ai;
    ENVIRONMENT?: string;
}

