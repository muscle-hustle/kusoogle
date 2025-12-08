import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'kusoogle - クソアプリ検索エンジン',
    description: 'クソアプリを検索できる世界初のクソアプリ検索エンジン',
    keywords: ['クソアプリ', 'kusoogle', '検索', 'Qiita'],
    authors: [{ name: 'kusoogle' }],
    openGraph: {
        title: 'kusoogle - クソアプリ検索エンジン',
        description: 'クソアプリを検索できる世界初のクソアプリ検索エンジン',
        type: 'website',
        url: 'https://kusoogle.muscle-hustle.workers.dev/',
        images: [
            {
                url: 'https://kusoogle.muscle-hustle.workers.dev/images/logo.png',
                width: 400,
                height: 187,
                alt: 'kusoogle - クソアプリ検索エンジン',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'kusoogle - クソアプリ検索エンジン',
        description: 'クソアプリを検索できる世界初のクソアプリ検索エンジン',
        images: ['https://kusoogle.muscle-hustle.workers.dev/images/logo.png'],
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

