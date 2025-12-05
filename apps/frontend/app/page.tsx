export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-8 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">
                        kusoogle
                    </h1>
                    <p className="text-lg text-gray-600">
                        クソアプリ検索エンジン
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full px-4 pb-8">
                <div className="max-w-4xl mx-auto">
                    {/* Search Form - 後で実装 */}
                    <div className="mb-8">
                        <p className="text-center text-gray-500">
                            検索フォームは後で実装します
                        </p>
                    </div>

                    {/* Search Results - 後で実装 */}
                    <div>
                        <p className="text-center text-gray-500">
                            検索結果は後で実装します
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

