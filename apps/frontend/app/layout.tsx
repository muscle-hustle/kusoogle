import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'kusoogle - クソアプリ検索エンジン',
    description: 'クソアプリアドベントカレンダーの記事を検索できる検索エンジン',
    keywords: ['クソアプリ', 'アドベントカレンダー', '検索', 'Qiita'],
    authors: [{ name: 'kusoogle' }],
    openGraph: {
        title: 'kusoogle - クソアプリ検索エンジン',
        description: 'クソアプリアドベントカレンダーの記事を検索できる検索エンジン',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>{children}</body>
        </html>
    );
}

