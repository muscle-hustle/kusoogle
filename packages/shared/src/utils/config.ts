import type { CalendarConfig, CalendarConfigFile } from '../types/config';

/**
 * カレンダー設定ファイルを読み込む
 * 
 * ローカル開発環境: ファイルシステムから読み込む
 * Cloudflare Workers環境: Workerのアセットとして含める（wrangler.tomlで設定）
 * 
 * @param configContent 設定ファイルの内容（JSON文字列）。未指定の場合は環境に応じて自動取得
 * @param configPath 設定ファイルのパス（オプション）。デフォルトは 'config/calendars.json'
 * @returns カレンダー設定の配列
 */
export async function loadCalendarConfig(
  configContent?: string,
  configPath: string = 'config/calendars.json'
): Promise<CalendarConfig[]> {
  try {
    let content: string;

    if (configContent) {
      // 既に内容が提供されている場合（環境変数から）
      content = configContent;
    } else {
      // ローカル開発環境用（Node.js/Bun）
      // @ts-ignore - Cloudflare Workers環境ではNode.jsのAPIが使えないため、型チェックをスキップ
      if (typeof process !== 'undefined' && process.versions?.node) {
        // @ts-ignore - 動的インポートのため型チェックをスキップ
        const fs = await import('fs/promises');
        // @ts-ignore - 動的インポートのため型チェックをスキップ
        const path = await import('path');
        // プロジェクトルートまたはWorkerディレクトリから相対パスで解決
        // @ts-ignore - process.cwd()はNode.js環境でのみ利用可能
        const filePath = path.resolve(process.cwd(), configPath);
        content = await fs.readFile(filePath, 'utf-8');
      } else {
        // Cloudflare Workers環境用
        // Workerのアセットとして含める場合、fetchで取得する
        // wrangler.tomlでassetsディレクトリを設定する必要がある
        try {
          const response = await fetch(`/${configPath}`);
          if (!response.ok) {
            throw new Error(`設定ファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
          }
          content = await response.text();
        } catch (fetchError) {
          throw new Error(
            `Cloudflare Workers環境では、設定ファイルをアセットとして含めるか、` +
            `環境変数CALENDARS_CONFIGにJSON文字列を設定してください。` +
            `エラー: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
          );
        }
      }
    }

    const config: CalendarConfigFile = JSON.parse(content);
    return config.calendars;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error(`設定ファイルの読み込みに失敗しました: ${error}`);
  }
}

/**
 * 自動更新対象のカレンダーを取得
 * @param calendars カレンダー設定の配列
 * @returns 自動更新対象のカレンダー
 */
export function getAutoUpdateCalendars(calendars: CalendarConfig[]): CalendarConfig[] {
  return calendars.filter(cal => cal.autoUpdate);
}

/**
 * 自動更新対象外のカレンダーを取得
 * @param calendars カレンダー設定の配列
 * @returns 自動更新対象外のカレンダー
 */
export function getNonAutoUpdateCalendars(calendars: CalendarConfig[]): CalendarConfig[] {
  return calendars.filter(cal => !cal.autoUpdate);
}

