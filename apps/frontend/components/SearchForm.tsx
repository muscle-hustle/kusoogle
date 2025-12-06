'use client';

import { useState, FormEvent } from 'react';
import { validateSearchQuery, getValidationError, sanitizeQuery } from '@kusoogle/shared';

interface SearchFormProps {
    onSearch: (query: string) => void;
    isLoading?: boolean;
}

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const sanitized = sanitizeQuery(query);
        const validationError = getValidationError(sanitized);

        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        onSearch(sanitized);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // リアルタイムでバリデーション（エラーをクリア）
        if (error && validateSearchQuery(value)) {
            setError(null);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={handleChange}
                        placeholder="検索したいクソアプリを入力..."
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        aria-label="検索クエリ入力"
                        aria-describedby={error ? 'search-error' : undefined}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    aria-label="検索実行"
                >
                    {isLoading ? '検索中...' : '検索'}
                </button>
            </div>
            {error && (
                <p
                    id="search-error"
                    className="mt-2 text-sm text-red-600"
                    role="alert"
                    aria-live="polite"
                >
                    {error}
                </p>
            )}
        </form>
    );
}

