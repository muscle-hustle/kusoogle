#!/bin/bash

# 初期データ取得スクリプト
# Data Collection Workerの/initializeエンドポイントを連続で呼び出し、全記事を処理する

# プロジェクトルートに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# .env.localファイルを読み込む（存在する場合）
if [ -f .env.local ]; then
    echo ".env.localを読み込み中..."
    # .env.localの各行を読み込んで環境変数として設定
    # コメント行（#で始まる行）と空行をスキップ
    while IFS= read -r line || [ -n "$line" ]; do
        # コメント行と空行をスキップ
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
            continue
        fi
        # 環境変数をエクスポート（既存の環境変数は上書きしない）
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            # 既に環境変数が設定されていない場合のみ設定
            if [ -z "${!key}" ]; then
                export "$key=$value"
            fi
        fi
    done < .env.local
fi

# 設定
DATA_COLLECTION_URL="${DATA_COLLECTION_URL:-http://localhost:8788}"
INITIALIZE_SECRET="${INITIALIZE_SECRET:-}"  # シークレットトークン（環境変数から取得）
MAX_ITERATIONS=1000  # 最大繰り返し回数（無限ループを防ぐ）
DELAY_BETWEEN_REQUESTS=1  # リクエスト間の待機時間（秒）

# カウンター
iteration=0
completed=false

echo "初期データ取得を開始します..."
echo "Data Collection Worker URL: $DATA_COLLECTION_URL"
if [ -n "$INITIALIZE_SECRET" ]; then
    echo "認証: シークレットトークンを使用"
else
    echo "警告: INITIALIZE_SECRETが設定されていません。認証なしで実行します。"
fi
echo ""

# 最初のリクエスト
url="$DATA_COLLECTION_URL/initialize"

while [ $iteration -lt $MAX_ITERATIONS ] && [ "$completed" != "true" ]; do
    iteration=$((iteration + 1))
    
    echo "[$iteration] リクエスト送信: $url"
    
    # リクエストを送信
    # シークレットトークンが設定されている場合はヘッダーに追加
    if [ -n "$INITIALIZE_SECRET" ]; then
        response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "X-Initialize-Secret: $INITIALIZE_SECRET" \
            -w "\n%{http_code}")
    else
        response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -w "\n%{http_code}")
    fi
    
    # HTTPステータスコードとレスポンスボディを分離
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    # HTTPステータスコードを確認
    if [ "$http_code" != "200" ]; then
        echo "エラー: HTTPステータスコード $http_code"
        echo "レスポンス: $body"
        exit 1
    fi
    
    # JSONをパース（jqが利用可能な場合）
    if command -v jq &> /dev/null; then
        message=$(echo "$body" | jq -r '.message // "N/A"')
        processed=$(echo "$body" | jq -r '.processed // "N/A"')
        calendar_id=$(echo "$body" | jq -r '.calendarId // "N/A"')
        article_index=$(echo "$body" | jq -r '.articleIndex // "N/A"')
        completed=$(echo "$body" | jq -r '.completed // false')
        next_url=$(echo "$body" | jq -r '.nextUrl // empty')
        total_articles=$(echo "$body" | jq -r '.totalArticles // "N/A"')
        processed_count=$(echo "$body" | jq -r '.processedCount // "N/A"')
        
        echo "  メッセージ: $message"
        echo "  処理済み: $processed"
        echo "  カレンダー: $calendar_id"
        echo "  記事インデックス: $article_index"
        if [ "$total_articles" != "N/A" ] && [ "$processed_count" != "N/A" ]; then
            echo "  進捗: $processed_count/$total_articles"
        fi
        echo "  完了: $completed"
        
        if [ "$completed" = "true" ]; then
            echo ""
            echo "✅ 初期データ取得が完了しました！"
            exit 0
        fi
        
        if [ -z "$next_url" ] || [ "$next_url" = "null" ]; then
            echo "エラー: nextUrlが取得できませんでした"
            echo "レスポンス: $body"
            exit 1
        fi
        
        # nextUrlが絶対URLの場合、ローカル開発環境のURLに置き換える
        if [[ "$next_url" == http* ]]; then
            # パスとクエリパラメータを抽出
            next_path=$(echo "$next_url" | sed -E 's|https?://[^/]+(.*)|\1|')
            url="${DATA_COLLECTION_URL}${next_path}"
        else
            url="$next_url"
        fi
    else
        # jqが利用できない場合、レスポンスをそのまま表示
        echo "レスポンス: $body"
        
        # completedを確認（簡易版）
        if echo "$body" | grep -q '"completed":\s*true'; then
            echo ""
            echo "✅ 初期データ取得が完了しました！"
            exit 0
        fi
        
        # nextUrlを抽出（簡易版）
        next_url=$(echo "$body" | grep -o '"nextUrl":\s*"[^"]*"' | cut -d'"' -f4)
        if [ -z "$next_url" ]; then
            echo "エラー: nextUrlが取得できませんでした"
            echo "レスポンス: $body"
            exit 1
        fi
        
        url="$next_url"
    fi
    
    echo ""
    
    # リクエスト間の待機（最後のリクエストの場合は待機しない）
    if [ "$completed" != "true" ]; then
        sleep $DELAY_BETWEEN_REQUESTS
    fi
done

if [ $iteration -ge $MAX_ITERATIONS ]; then
    echo "警告: 最大繰り返し回数（$MAX_ITERATIONS回）に達しました"
    echo "処理が完了していない可能性があります"
    exit 1
fi

