/**
 * タグをテキストに変換（Embedding生成用）
 * @param tags タグの配列
 * @returns タグをスペース区切りで結合した文字列
 */
export function formatTagsForEmbedding(tags: string[]): string {
  return tags.join(' ');
}

/**
 * 文字列を安全に切り詰める
 * @param text テキスト
 * @param maxLength 最大長
 * @param suffix 切り詰め時の接尾辞（デフォルト: "..."）
 * @returns 切り詰められたテキスト
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

