import ArticleCard from './ArticleCard';
import SkeletonCard from './SkeletonCard';
import type { SearchResult } from '@kusoogle/shared';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query?: string;
}

export default function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  // ローディング状態
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  // 結果がない場合
  if (results.length === 0 && query) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="mb-4">
            <span className="text-4xl" role="img" aria-label="お祝い">
              🎉
            </span>
          </div>
          <h2 className="text-xl font-bold text-primary-600 mb-3">
            オリジナルなクソアプリですね！
          </h2>
          <p className="text-lg text-gray-700 mb-2">
            類似のクソアプリは見つかりませんでした
          </p>
          <p className="text-sm text-gray-600 mb-4">
            これは、あなたのアイデアがユニークだということです
          </p>
          <p className="text-base font-medium text-accent-600">
            Let's make a kuso-app! 🚀
          </p>
        </div>
      </div>
    );
  }

  // 結果がある場合
  if (results.length > 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        {/* 結果件数表示 */}
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            <span className="font-semibold">{results.length}件</span>の類似クソアプリが見つかりました
          </p>
        </div>

        {/* 記事カード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    );
  }

  // 初期状態（検索前）
  return null;
}

