'use client';

import { useState, FormEvent } from 'react';
import { searchQuerySchema, getValidationErrorMessage } from '@kusoogle/shared';

interface SearchFormProps {
    onSearch: (query: string) => void;
    isLoading?: boolean;
}

// 検索例のリスト
const SEARCH_EXAMPLES = [
    'タスク管理',
    '目覚まし時計',
    'ゲームアプリ',
];

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Zodスキーマでバリデーション
        const parseResult = searchQuerySchema.safeParse(query);
        if (!parseResult.success) {
            const errorMessage = getValidationErrorMessage(parseResult, '検索クエリのバリデーションに失敗しました');
            setError(errorMessage || '検索クエリのバリデーションに失敗しました');
            return;
        }

        setError(null);
        // サニタイズ済みのクエリを使用
        onSearch(parseResult.data);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        // リアルタイムでバリデーション（エラーをクリア）
        if (error) {
            const parseResult = searchQuerySchema.safeParse(value);
            if (parseResult.success) {
                setError(null);
            }
        }
    };

    const handleExampleClick = (example: string) => {
        setQuery(example);
        setError(null);
        // Zodスキーマでバリデーションして検索を実行
        const parseResult = searchQuerySchema.safeParse(example);
        if (!parseResult.success) {
            // 検索例が不正な場合はエラーを表示（通常は発生しない）
            const errorMessage = getValidationErrorMessage(parseResult, '検索クエリのバリデーションに失敗しました');
            setError(errorMessage || '検索クエリのバリデーションに失敗しました');
        } else {
            onSearch(parseResult.data);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="relative">
                {/* 虫眼鏡アイコン */}
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    placeholder="クソアプリのアイデアを入力"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                    aria-label="検索クエリ入力"
                    aria-describedby={error ? 'search-error' : undefined}
                />
                {/* ローディング中のインジケーター */}
                {isLoading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <svg
                            className="animate-spin h-5 w-5 text-primary-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                )}
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

            {/* 検索例 */}
            {!isLoading && query === '' && (
                <div className="mt-6 space-y-2">
                    {SEARCH_EXAMPLES.map((example, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleExampleClick(example)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 group"
                            aria-label={`検索例: ${example}`}
                        >
                            <svg
                                className="w-4 h-4 text-gray-400 group-hover:text-primary-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <span>{example}</span>
                        </button>
                    ))}
                </div>
            )}
        </form>
    );
}

