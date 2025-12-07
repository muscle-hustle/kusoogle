'use client';

import { useState } from 'react';
import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import { searchArticles } from '../app/actions/search';
import type { SearchResult } from '@kusoogle/shared';

/**
 * 検索ページのクライアントコンポーネント
 * インタラクティブな機能（状態管理、検索処理）を担当
 */
export default function SearchPageClient() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState<string>('');

    const handleSearch = async (searchQuery: string) => {
        // 状態をリセット
        setError(null);
        setQuery(searchQuery);
        setIsLoading(true);
        setResults([]);

        try {
            // Server Actionで検索を実行
            const response = await searchArticles(searchQuery);
            setResults(response.results);
        } catch (err) {
            // エラーハンドリング
            const errorMessage = err instanceof Error ? err.message : '検索中にエラーが発生しました';
            console.error('検索エラー:', err);
            setError(errorMessage);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Search Form */}
            <div className="mb-8">
                <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {/* Error Message */}
            {error && (
                <div className="w-full max-w-4xl mx-auto">
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl" role="img" aria-label="警告">
                                ⚠️
                            </span>
                            <div className="flex-1">
                                <h3 className="font-bold text-red-800 mb-1">
                                    検索中にエラーが発生しました
                                </h3>
                                <p className="text-red-700 text-sm">
                                    {error}
                                </p>
                                <p className="text-red-600 text-xs mt-2">
                                    しばらくしてから再度お試しください。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Results */}
            <SearchResults results={results} isLoading={isLoading} query={query} />
        </div>
    );
}

