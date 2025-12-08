import type { Ai } from '@cloudflare/workers-types';
import { truncate } from '@kusoogle/shared';

/**
 * 記事本文を要約する
 * Cloudflare AI WorkersのLLMを使用して技術記事を要約します
 * @param body 記事本文
 * @param ai AI Workersバインディング
 * @param maxLength 要約の最大文字数
 * @returns 要約されたテキスト
 */
export async function summarizeArticle(
    body: string,
    ai: Ai,
    maxLength: number
): Promise<string> {
    const systemPrompt = `技術記事を${maxLength}文字以内で要約してください。
記事の内容を具体的に、簡潔に記述してください。

要約には以下を含めてください：
- アプリの具体的な機能や特徴（何をするアプリか）
- 特殊な点や制限事項（利用用途が限られている点など）

以下の情報は含めないでください：
- 「クソアプリ」という単語
- 「どのような場面で」「どのようなユーザー体験」などの定型表現
- 「〜なアプリ」「〜するツール」などの汎用的な表現
- コードブロックの内容
- 前書きや背景説明
- URLやリンク
- 作者紹介
- 文字装飾（*や**など）

要約は記事の内容を直接的に記述し、定型表現や汎用的な表現は避けてください。
各記事の独自性を強調するような具体的な記述を心がけてください。
`;

    try {
        // 型定義の問題を回避するため、any型を使用
        const result = await (ai as any).run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: body,
                },
            ],
        });

        // 型定義の問題を回避するため、any型を使用
        const response = (result as any).response;
        if (!response || typeof response !== 'string') {
            throw new Error('要約生成のレスポンスが無効です');
        }

        // 最大文字数+αの文字数を超えている場合は切り詰め
        return truncate(response, maxLength + 100);
    } catch (error) {
        console.error('要約生成に失敗しました:', error);
        throw new Error(`要約生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
}

