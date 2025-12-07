import { formatDateTime, formatRelativeDate } from '@kusoogle/shared';
import type { SearchResult } from '@kusoogle/shared';

interface ArticleCardProps {
  article: SearchResult;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const similarityPercentage = Math.round(article.similarity * 100);

  return (
    <article className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 p-6">
      {/* ヘッダー: 著者名と出典 */}
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm text-gray-600">
          <a
            href={`https://qiita.com/${article.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors"
          >
            @{article.author}
          </a>
        </div>
        <div className="text-xs text-gray-500">
          出典: Qiita
        </div>
      </div>

      {/* タイトル */}
      <h2 className="mb-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          {article.title}
        </a>
      </h2>

      {/* タグ */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-accent-100 text-accent-800 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* メタ情報: 投稿日時といいね数 */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <time
          dateTime={article.createdAt}
          className="text-gray-500 tooltip"
          data-tooltip={formatDateTime(article.createdAt)}
        >
          {formatRelativeDate(article.createdAt)}
        </time>
        <div className="flex items-center gap-1">
          <span className="text-red-500" aria-label="いいね数">
            ❤️
          </span>
          <span>{article.likesCount}</span>
        </div>
      </div>

      {/* 類似度スコア */}
      <div className="mb-4 text-sm">
        <span className="text-gray-600">類似度: </span>
        <span className="font-semibold text-primary-600">{similarityPercentage}%</span>
      </div>

      {/* Qiitaで読むボタン */}
      <div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Qiitaで読む
        </a>
      </div>
    </article>
  );
}

