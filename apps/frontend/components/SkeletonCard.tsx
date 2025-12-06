export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-3">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-3 w-16 bg-gray-200 rounded"></div>
      </div>

      {/* タイトル */}
      <div className="mb-4 space-y-2">
        <div className="h-6 w-full bg-gray-200 rounded"></div>
        <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
      </div>

      {/* タグ */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-14 bg-gray-200 rounded-full"></div>
      </div>

      {/* メタ情報 */}
      <div className="flex items-center gap-4 mb-3">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>

      {/* 類似度 */}
      <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>

      {/* ボタン */}
      <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

