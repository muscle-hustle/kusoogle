/**
 * 日付を日本語形式でフォーマット
 * @param dateString ISO 8601形式の日付文字列
 * @returns フォーマット済みの日付文字列（例: "2025年12月5日"）
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 日付と時刻を日本語形式でフォーマット（時間と分まで表示）
 * @param dateString ISO 8601形式の日付文字列
 * @returns フォーマット済みの日時文字列（例: "2025年11月30日 23:56"）
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const datePart = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

/**
 * 日付を相対時間でフォーマット（例: "3日前"）
 * @param dateString ISO 8601形式の日付文字列
 * @returns 相対時間の文字列
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今日';
  } else if (diffDays === 1) {
    return '昨日';
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}週間前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}ヶ月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
}

