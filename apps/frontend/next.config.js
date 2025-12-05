/** @type {import('next').NextConfig} */
const nextConfig = {
    // 環境変数
    env: {
        NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:8787',
    },
    // 開発環境ではstandaloneを無効化
    ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
};

module.exports = nextConfig;

