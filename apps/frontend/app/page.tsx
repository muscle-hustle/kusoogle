import { Suspense } from 'react';
import SearchPageClient from '../components/SearchPageClient';
import Footer from '../components/Footer';
import Image from 'next/image';

/**
 * ホームページ（サーバーコンポーネント）
 * 静的な部分（ヘッダー）はサーバー側でHTMLとして生成される
 * インタラクティブな部分（検索機能）はクライアントコンポーネントに分離
 */
export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* Header - サーバー側でHTMLとして生成される */}
            <header className="w-full pt-16 pb-8 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* ロゴ画像（ダミー） */}
                    <div className="mb-5 flex justify-center">
                        <Image
                            src="/images/logo.png"
                            alt="kusoogle"
                            width={400}
                            height={187}
                            className="h-auto rounded-2xl"
                            style={{ height: '187px' }}
                            priority
                        />
                    </div>
                </div>
            </header>

            {/* Main Content - インタラクティブな部分はクライアントコンポーネント */}
            <main className="flex-1 w-full px-4 pb-8">
                <Suspense
                    fallback={
                        <div className="max-w-4xl mx-auto text-center text-gray-500">
                            検索UIを読み込み中...
                        </div>
                    }
                >
                    <SearchPageClient />
                </Suspense>
            </main>

            {/* Footer - クレジット表記とGitHubリンク */}
            <Footer />
        </div>
    );
}
