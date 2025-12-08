'use client';

import ArticleCard from './ArticleCard';
import SkeletonCard from './SkeletonCard';
import type { SearchResult } from '@kusoogle/shared';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query?: string;
}

export default function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  // クエリを短縮（URLが長くなりすぎないように、最大50文字に制限）
  const truncatedQuery = query && query.length > 50 ? query.substring(0, 50) + '...' : query;

  // URLを短縮（クエリパラメータ名を短く）
  const shareTargetUrl =
    typeof window !== 'undefined' && query
      ? `${window.location.origin}?q=${encodeURIComponent(truncatedQuery || query)}`
      : '';

  // シェアテキストを短く（Xの文字数制限280文字に対応）
  // クエリが長い場合は短縮版を使用
  const displayQuery = query && query.length > 30 ? query.substring(0, 30) + '...' : query;
  const isUnique = !!query && results.length === 0;
  const shareText = displayQuery
    ? isUnique
      ? `「${displayQuery}」は前人未踏の #奇跡のクソアプリ です #kusoogle`
      : `「${displayQuery}」は #量産型クソアプリ です #kusoogle`
    : 'kusoogleでクソアプリ検索 #クソアプリ #kusoogle';

  // XのシェアURL（テキストとURLを分けて、URLは短縮）
  const xShareUrl = shareTargetUrl
    ? `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareTargetUrl)}`
    : `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

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
          <p className="text-base font-medium text-accent-600">
            Let's make a kuso-app! 🚀
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href={xShareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Xで検索結果をシェア"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M18.901 2.1h3.327l-7.264 8.296 8.548 11.504H16.17l-5.214-6.814-5.96 6.814H1.67l7.77-8.873L1.24 2.1h6.98l4.713 6.215L18.9 2.1zm-1.164 17.317h1.844L6.356 4.2H4.392l13.345 15.217z" />
              </svg>
              Xでシェア
            </a>
          </div>
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
          {query && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-600">あなたのアイデアは量産型クソアプリです。</p>
              <div className="flex justify-center">
                <a
                  href={xShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors"
                  aria-label="Xで検索結果をシェア"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M18.901 2.1h3.327l-7.264 8.296 8.548 11.504H16.17l-5.214-6.814-5.96 6.814H1.67l7.77-8.873L1.24 2.1h6.98l4.713 6.215L18.9 2.1zm-1.164 17.317h1.844L6.356 4.2H4.392l13.345 15.217z" />
                  </svg>
                  Xでシェア
                </a>
              </div>
            </div>
          )}
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

