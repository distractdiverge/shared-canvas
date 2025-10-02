'use client';

import { useRef, useEffect, useState } from 'react';
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Redraw canvas whenever strokes, offset, or scale changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // Account for toolbar

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    // Render all strokes
    strokes.forEach((stroke) => {
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
  }, [strokes, offset, scale, currentStroke, userColor]);

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
      setLastPanPoint(point);
      return;
    }

    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentStroke([point]);
    }

    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        onTextAdd(text, point, userColor);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);

    if (isPanning && lastPanPoint) {
      const dx = (point.x - lastPanPoint.x) * scale;
      const dy = (point.y - lastPanPoint.y) * scale;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setLastPanPoint(point);
      return;
    }

    if (!isDrawing || tool !== 'draw') return;

    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (isDrawing && currentStroke.length > 0) {
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
