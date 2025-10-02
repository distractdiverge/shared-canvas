'use client';

export type ToolType = 'draw' | 'text' | 'pan';

interface ToolbarProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export default function Toolbar({
  selectedTool,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onResetView,
}: ToolbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex gap-2">
        <button
          onClick={() => onToolChange('draw')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTool === 'draw'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Draw
        </button>
        <button
          onClick={() => onToolChange('text')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTool === 'text'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Text
        </button>
        <button
          onClick={() => onToolChange('pan')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedTool === 'pan'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pan
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onZoomOut}
          className="w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={onResetView}
          className="w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          aria-label="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
        <button
          onClick={onZoomIn}
          className="w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
