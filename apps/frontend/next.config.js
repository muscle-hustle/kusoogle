/** @type {import('next').NextConfig} */
const nextConfig = {
    // 環境変数
    env: {
        NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:8787',
    },
    // Cloudflare Pages用の設定
    // output: 'standalone'は削除（Cloudflare Pagesでは不要）
    // Cloudflare Pagesでは自動的に最適化されたビルドが生成されます
};

module.exports = nextConfig;

