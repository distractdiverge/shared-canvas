'use client';

import { useState } from 'react';
import Canvas from '@/components/Canvas';
import NameEntryModal from '@/components/NameEntryModal';
import OfflineScreen from '@/components/OfflineScreen';
import Toolbar, { ToolType } from '@/components/Toolbar';
import { useSession } from '@/hooks/useSession';
import { useRealtime } from '@/hooks/useRealtime';
import { useOffline } from '@/hooks/useOffline';
import { Point } from '@/lib/types';

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<ToolType>('draw');
  const [zoom, setZoom] = useState(1);

  // Session management
  const { user, session, loading: sessionLoading, error, registerUser } = useSession();

  // Realtime collaboration
  const { strokes, cursors, loading: strokesLoading, sendStroke, sendCursorPosition } = useRealtime(
    user?.id || null,
    user?.display_name || null,
    user?.selected_color || null
  );

  // Offline detection
  const isOffline = useOffline();

  // Handle user registration from modal
  const handleUserSubmit = async (name: string, color: string) => {
    await registerUser(name, color);
  };

  // Handle stroke completion
  const handleStrokeComplete = async (points: Point[], color: string) => {
    if (!user || !session) return;

    await sendStroke({
      user_id: user.id,
      session_id: session.id,
      type: 'draw',
      points,
      color,
      text: undefined,
      position: undefined,
    });
  };

  // Handle text addition
  const handleTextAdd = async (text: string, position: Point, color: string) => {
    if (!user || !session) return;

    await sendStroke({
      user_id: user.id,
      session_id: session.id,
      type: 'text',
      text,
      position,
      color,
      points: undefined,
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
  };

  // Show offline screen
  if (isOffline) {
    return <OfflineScreen />;
  }

  // Show name entry modal for new users
  if (!user && !sessionLoading) {
    return <NameEntryModal onSubmit={handleUserSubmit} />;
  }

  // Show loading state
  if (sessionLoading || strokesLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-4">Shared Canvas</h1>
        <p className="text-lg text-gray-600">Loading canvas...</p>
      </main>
    );
  }

  // Show error state
  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-4 text-red-600">Error</h1>
        <p className="text-lg text-gray-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Reload
        </button>
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* User info bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: user?.selected_color }}
          />
          <span className="font-medium">{user?.display_name}</span>
        </div>
        <div className="text-sm text-gray-500">
          {strokes.length} stroke{strokes.length !== 1 ? 's' : ''} · {cursors.length} user
          {cursors.length !== 1 ? 's' : ''} online
        </div>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0 pt-12 pb-16">
        <Canvas
          userColor={user?.selected_color || '#FF6B6B'}
          tool={selectedTool}
          onStrokeComplete={handleStrokeComplete}
          onTextAdd={handleTextAdd}
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Other users' cursors */}
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="fixed pointer-events-none z-20"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: cursor.color }}
          />
          <div className="absolute top-5 left-5 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {cursor.userName}
          </div>
        </div>
      ))}
    </main>
  );
}
