/**
 * Qiita記事の基本情報
 * 記事本文はEmbedding生成にのみ使用し、保存・表示しない（Qiita利用規約遵守のため）
 */
export interface Article {
    id: string;
    title: string;
    url: string;
    // body: 削除（記事本文は保存しない）
    tags: string[];
    createdAt: string; // ISO 8601形式（投稿日時）
    updatedAt: string; // ISO 8601形式（更新日時）
    author: string;
    likesCount: number;
}

/**
 * Vectorizeに保存する記事データ
 */
export interface VectorizeArticle {
    id: string; // 記事ID（Qiita記事ID）
    values: number[]; // Embeddingベクトル（768次元）
    // 記事本文はEmbedding生成にのみ使用し、保存しない（Qiita利用規約遵守のため）
    metadata: {
        title: string; // 記事タイトル
        url: string; // 記事URL
        // body: 保存しない（Embedding生成にのみ一時的に使用）
        tags: string[]; // タグ（文字列配列）
        createdAt: string; // 投稿日時（ISO 8601）
        updatedAt: string; // 更新日時（ISO 8601）- cronで取得した記事の更新日時と比較してデータ更新を判定
        author: string; // 投稿者ID
        likesCount: number; // いいね数
    };
}

