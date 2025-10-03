import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Stroke, CursorPosition, Point } from '@/lib/types';
import { REALTIME_CHANNEL_NAME, CURSOR_UPDATE_THROTTLE_MS } from '@/lib/constants';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeReturn {
  strokes: Stroke[];
  cursors: CursorPosition[];
  onlineUsers: number;
  loading: boolean;
  sendStroke: (stroke: Omit<Stroke, 'id' | 'created_at'>) => Promise<void>;
  sendCursorPosition: (x: number, y: number) => void;
  sendDrawingProgress: (points: Point[], color: string) => void;
  sendDrawingComplete: () => void;
  drawingStrokes: Map<string, { points: Point[]; color: string }>;
}

/**
 * Hook to manage Supabase realtime subscriptions
 * Handles stroke broadcasting and cursor position sharing
 */
export function useRealtime(
  userId: string | null,
  userName: string | null,
  userColor: string | null
): UseRealtimeReturn {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [lastCursorUpdate, setLastCursorUpdate] = useState(0);
  const [drawingStrokes, setDrawingStrokes] = useState<Map<string, { points: Point[]; color: string }>>(new Map());

  /**
   * Load existing strokes from database
   */
  useEffect(() => {
    const loadStrokes = async () => {
      try {
        const response = await fetch('/api/stroke');
        const data = await response.json();

        if (data.success) {
          setStrokes(data.strokes);
        }
      } catch (error) {
        console.error('Error loading strokes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStrokes();
  }, []);

  /**
   * Set up realtime subscriptions
   */
  useEffect(() => {
    if (!userId || !userName || !userColor) {
      return;
    }

    // Create realtime channel with broadcast and presence enabled
    const realtimeChannel = supabase.channel(REALTIME_CHANNEL_NAME, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    // Listen for presence changes
    realtimeChannel.on('presence', { event: 'sync' }, () => {
      const state = realtimeChannel.presenceState();
      const count = Object.keys(state).length;
      setOnlineUsers(count);
    });

    realtimeChannel.on('presence', { event: 'join' }, () => {
      const state = realtimeChannel.presenceState();
      setOnlineUsers(Object.keys(state).length);
    });

    realtimeChannel.on('presence', { event: 'leave' }, () => {
      const state = realtimeChannel.presenceState();
      setOnlineUsers(Object.keys(state).length);
    });

    // Subscribe to new strokes and broadcast events
    realtimeChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'strokes',
        },
        (payload) => {
          const newStroke = payload.new as Stroke;
          setStrokes((prev) => [...prev, newStroke]);
        }
      )
      .on('broadcast', { event: 'cursor' }, (payload) => {
        const cursorData = payload.payload as CursorPosition;

        // Don't show our own cursor
        if (cursorData.userId === userId) return;

        // Update or add cursor
        setCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== cursorData.userId);
          return [...filtered, cursorData];
        });

        // Remove cursor after 3 seconds of inactivity
        setTimeout(() => {
          setCursors((prev) =>
            prev.filter((c) => {
              if (c.userId === cursorData.userId) {
                return Date.now() - c.timestamp < 3000;
              }
              return true;
            })
          );
        }, 3000);
      })
      .on('broadcast', { event: 'drawing' }, (payload) => {
        const { userId: drawingUserId, points, color } = payload.payload as {
          userId: string;
          points: Point[];
          color: string;
        };

        // Don't show our own drawing progress
        if (drawingUserId === userId) return;

        // Update drawing stroke in progress
        setDrawingStrokes((prev) => {
          const newMap = new Map(prev);
          newMap.set(drawingUserId, { points, color });
          return newMap;
        });
      })
      .on('broadcast', { event: 'drawing-complete' }, (payload) => {
        const { userId: drawingUserId } = payload.payload as { userId: string };

        // Delay removing the in-progress stroke to avoid flashing
        // Keep it visible for 500ms to ensure database stroke appears first
        setTimeout(() => {
          setDrawingStrokes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(drawingUserId);
            return newMap;
          });
        }, 500);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence when subscribed
          await realtimeChannel.track({
            user_id: userId,
            user_name: userName,
            user_color: userColor,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.untrack();
      realtimeChannel.unsubscribe();
    };
  }, [userId, userName, userColor]);

  /**
   * Send a new stroke to the database and broadcast it
   */
  const sendStroke = useCallback(async (stroke: Omit<Stroke, 'id' | 'created_at'>) => {
    try {
      const response = await fetch('/api/stroke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stroke),
      });

      if (!response.ok) {
        console.error('Failed to save stroke');
      }

      // Stroke will be added via realtime subscription
    } catch (error) {
      console.error('Error sending stroke:', error);
    }
  }, []);

  /**
   * Broadcast cursor position to other users (throttled)
   */
  const sendCursorPosition = useCallback((x: number, y: number) => {
    if (!channel || !userId || !userName || !userColor) return;

    const now = Date.now();
    if (now - lastCursorUpdate < CURSOR_UPDATE_THROTTLE_MS) {
      return;
    }

    const cursorData: CursorPosition = {
      userId,
      userName,
      color: userColor,
      x,
      y,
      timestamp: now,
    };

    channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: cursorData,
    });

    setLastCursorUpdate(now);
  }, [channel, userId, userName, userColor, lastCursorUpdate]);

  /**
   * Broadcast drawing progress to other users (throttled)
   */
  const sendDrawingProgress = useCallback((points: Point[], color: string) => {
    if (!channel || !userId) return;

    channel.send({
      type: 'broadcast',
      event: 'drawing',
      payload: {
        userId,
        points,
        color,
      },
    });
  }, [channel, userId]);

  /**
   * Broadcast drawing completion to other users
   */
  const sendDrawingComplete = useCallback(() => {
    if (!channel || !userId) return;

    channel.send({
      type: 'broadcast',
      event: 'drawing-complete',
      payload: {
        userId,
      },
    });
  }, [channel, userId]);

  return {
    strokes,
    cursors,
    onlineUsers,
    loading,
    sendStroke,
    sendCursorPosition,
    sendDrawingProgress,
    sendDrawingComplete,
    drawingStrokes,
  };
}
