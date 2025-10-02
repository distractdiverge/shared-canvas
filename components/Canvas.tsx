'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Stroke } from '@/lib/types';

interface CanvasProps {
  userColor: string;
  tool: 'draw' | 'text' | 'pan';
  strokes?: Stroke[];
  onStrokeComplete: (points: Point[], color: string) => void;
  onTextAdd: (text: string, position: Point, color: string) => void;
}

export default function Canvas({
  userColor,
  tool,
  strokes = [],
  onStrokeComplete,
  onTextAdd
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeCountRef = useRef(0);
  const newStrokeTimestamps = useRef<Map<string, number>>(new Map());

  // Track when new strokes arrive from database
  useEffect(() => {
    const newStrokeCount = strokes.length;
    if (newStrokeCount > strokeCountRef.current) {
      // Mark new strokes with timestamp for fade-in animation
      const newStrokes = strokes.slice(strokeCountRef.current);
      const now = Date.now();
      newStrokes.forEach(stroke => {
        if (!newStrokeTimestamps.current.has(stroke.id)) {
          newStrokeTimestamps.current.set(stroke.id, now);
        }
      });

      // Clear local strokes older than 2 seconds
      const cutoffTime = Date.now() - 2000;
      setLocalStrokes(prev =>
        prev.filter(local => new Date(local.created_at).getTime() > cutoffTime)
      );
    }
    strokeCountRef.current = newStrokeCount;
  }, [strokes.length]);

  // Redraw canvas whenever strokes, offset, or scale changes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    // Render all database strokes with fade-in animation
    const now = Date.now();
    strokes.forEach((stroke) => {
      // Calculate opacity for fade-in (300ms duration)
      const timestamp = newStrokeTimestamps.current.get(stroke.id);
      let opacity = 1;
      if (timestamp) {
        const age = now - timestamp;
        if (age < 300) {
          opacity = age / 300; // Fade in over 300ms
        } else {
          // Remove from map after animation completes
          newStrokeTimestamps.current.delete(stroke.id);
        }
      }

      ctx.globalAlpha = opacity;

      if (stroke.type === 'draw' && stroke.points) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (stroke.type === 'text' && stroke.text && stroke.position) {
        ctx.fillStyle = stroke.color;
        ctx.font = '16px sans-serif';
        ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
      }

      ctx.globalAlpha = 1; // Reset opacity
    });

    // Render local strokes (optimistic UI)
    localStrokes.forEach((stroke) => {
      if (stroke.type === 'draw' && stroke.points) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (stroke.type === 'text' && stroke.text && stroke.position) {
        ctx.fillStyle = stroke.color;
        ctx.font = '16px sans-serif';
        ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
      }
    });

    // Draw current stroke in progress
    if (currentStroke.length > 0) {
      ctx.strokeStyle = userColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      currentStroke.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }

    ctx.restore();
  }, [strokes, localStrokes, currentStroke, offset, scale, userColor]);

  // Setup canvas and redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // Account for toolbar

    redrawCanvas();
  }, [redrawCanvas]);

  // Animation loop for fade-in effects
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (newStrokeTimestamps.current.size > 0) {
        redrawCanvas();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (newStrokeTimestamps.current.size > 0) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [strokes.length, redrawCanvas]);

  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);

    if (tool === 'pan') {
      setIsPanning(true);
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentStroke([point]);
    }

    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        // Add to local strokes immediately
        const localText: Stroke = {
          id: `local-${Date.now()}`,
          user_id: '',
          session_id: '',
          type: 'text',
          text,
          position: point,
          color: userColor,
          created_at: new Date().toISOString(),
        };
        setLocalStrokes(prev => [...prev, localText]);
        onTextAdd(text, point, userColor);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && lastPanPointRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const point = getCanvasPoint(e.clientX, e.clientY);

    if (!isDrawing || tool !== 'draw') return;

    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPointRef.current = null;
      return;
    }

    if (isDrawing && currentStroke.length > 0) {
      // Add to local strokes immediately
      const localDraw: Stroke = {
        id: `local-${Date.now()}`,
        user_id: '',
        session_id: '',
        type: 'draw',
        points: currentStroke,
        color: userColor,
        created_at: new Date().toISOString(),
      };
      setLocalStrokes(prev => [...prev, localDraw]);

      onStrokeComplete(currentStroke, userColor);
      setCurrentStroke([]);
    }
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="touch-none"
      style={{ cursor: tool === 'pan' ? 'grab' : tool === 'text' ? 'text' : 'crosshair' }}
    />
  );
}
