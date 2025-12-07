#!/bin/bash

# Workersデプロイスクリプト
# 各Workerを順次デプロイし、進捗を表示

set -e  # エラー時に終了

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Workersのデプロイを開始します..."
echo ""

# Search API Workerのデプロイ
echo "📦 Search API Workerをデプロイ中..."
cd apps/workers/search
if bun run deploy; then
    echo "✅ Search API Workerのデプロイが完了しました"
else
    echo "❌ Search API Workerのデプロイに失敗しました"
    exit 1
fi
cd "$PROJECT_ROOT"
echo ""

# Data Collection Workerのデプロイ
echo "📦 Data Collection Workerをデプロイ中..."
echo "  注意: Cron Triggerの設定により、デプロイに数分かかる場合があります..."
cd apps/workers/data-collection
if bun run deploy; then
    echo "✅ Data Collection Workerのデプロイが完了しました"
else
    echo "❌ Data Collection Workerのデプロイに失敗しました"
    exit 1
fi
cd "$PROJECT_ROOT"
echo ""

echo "🎉 すべてのWorkersのデプロイが完了しました！"
