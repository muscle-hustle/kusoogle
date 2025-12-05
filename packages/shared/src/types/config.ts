/**
 * カレンダー設定
 */
export interface CalendarConfig {
  id: string; // カレンダーID（例: "2025-01"）
  url: string; // カレンダーURL
  year: number; // 年
  autoUpdate: boolean; // trueの場合、Cron Triggerで日次更新を行う
}

/**
 * 設定ファイルのルート構造
 */
export interface CalendarConfigFile {
  calendars: CalendarConfig[];
}

