'use client';

import { useRef, useEffect, useState } from 'react';
import { Point } from '@/lib/types';

interface CanvasProps {
  userColor: string;
  tool: 'draw' | 'text' | 'pan';
  onStrokeComplete: (points: Point[], color: string) => void;
  onTextAdd: (text: string, position: Point, color: string) => void;
}

export default function Canvas({ userColor, tool, onStrokeComplete, onTextAdd }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // Account for toolbar

    // Clear and set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
  }, [offset, scale]);

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

    // Draw the current stroke
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = userColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
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
