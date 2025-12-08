/** @type {import('next').NextConfig} */
const nextConfig = {
    // 環境変数
    // .env.productionファイルから自動的に読み込まれます
    // 開発環境では.env.localまたはデフォルト値（localhost:8787）を使用
    env: {
        NEXT_PUBLIC_SEARCH_API_URL:
            process.env.NEXT_PUBLIC_SEARCH_API_URL || 'http://localhost:8787',
    },
    // Cloudflare Workers用の設定
    // @opennextjs/cloudflareを使用してServer ComponentsとServer Actionsをサポート

    // webpack設定: Node.jsモジュールを外部化（クライアントサイドで解決しないようにする）
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // クライアントサイドでは、Node.jsのモジュールを解決しない
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                'fs/promises': false,
            };
        }
        return config;
    },
};

module.exports = nextConfig;

