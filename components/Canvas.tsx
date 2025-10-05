'use client';

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import Konva from 'konva';
import { Point, Stroke } from '@/lib/types';

interface CanvasProps {
  userColor: string;
  tool: 'draw' | 'text' | 'pan';
  strokes?: Stroke[];
  drawingStrokes?: Map<string, { points: Point[]; color: string }>;
  onStrokeComplete: (points: Point[], color: string) => void;
  onTextAdd: (text: string, position: Point, color: string) => void;
  onDrawingProgress: (points: Point[], color: string) => void;
  onDrawingComplete: () => void;
}

export default function Canvas({
  userColor,
  tool,
  strokes = [],
  drawingStrokes = new Map(),
  onStrokeComplete,
  onTextAdd,
  onDrawingProgress,
  onDrawingComplete
}: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const strokeCountRef = useRef(0);
  const newStrokeTimestamps = useRef<Map<string, number>>(new Map());
  const recentlyCompletedDrawings = useRef<Map<string, number>>(new Map());
  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 60 : 600
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 60
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track when new strokes arrive from database
  useEffect(() => {
    const newStrokeCount = strokes.length;
    if (newStrokeCount > strokeCountRef.current) {
      // Mark new strokes with timestamp for fade-in animation
      // BUT skip fade-in for strokes that were recently shown in-progress
      const newStrokes = strokes.slice(strokeCountRef.current);
      const now = Date.now();
      newStrokes.forEach(stroke => {
        if (!newStrokeTimestamps.current.has(stroke.id)) {
          // Check if this user recently completed a drawing (within last 1 second)
          const lastCompleted = recentlyCompletedDrawings.current.get(stroke.user_id);
          const wasRecentlyInProgress = lastCompleted && (now - lastCompleted) < 1000;

          // Only add fade-in timestamp if we didn't recently see this user drawing
          if (!wasRecentlyInProgress) {
            newStrokeTimestamps.current.set(stroke.id, now);
          }
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

  // Track when drawing-in-progress is removed (completed)
  const prevDrawingStrokesRef = useRef(drawingStrokes);
  useEffect(() => {
    const prev = prevDrawingStrokesRef.current;
    const now = Date.now();

    // Find which users were removed (completed drawing)
    prev.forEach((_, userId) => {
      if (!drawingStrokes.has(userId)) {
        recentlyCompletedDrawings.current.set(userId, now);
      }
    });

    // Clean up old entries (older than 2 seconds)
    recentlyCompletedDrawings.current.forEach((timestamp, userId) => {
      if (now - timestamp > 2000) {
        recentlyCompletedDrawings.current.delete(userId);
      }
    });

    prevDrawingStrokesRef.current = drawingStrokes;
  }, [drawingStrokes]);

  // Helper to flatten points array for Konva Line
  const flattenPoints = (points: Point[]): number[] => {
    return points.flatMap(p => [p.x, p.y]);
  };

  // Helper to get stage point (accounting for pan/zoom)
  const getStagePoint = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>): Point => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };

    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };

    // Transform to stage coordinates (inverse of stage transform)
    return {
      x: (pos.x - stagePos.x) / stageScale,
      y: (pos.y - stagePos.y) / stageScale,
    };
  };

  // Calculate opacity for fade-in animation
  const getStrokeOpacity = (strokeId: string): number => {
    const timestamp = newStrokeTimestamps.current.get(strokeId);
    if (!timestamp) return 1;

    const age = Date.now() - timestamp;
    if (age < 300) {
      return age / 300; // Fade in over 300ms
    }
    
    // Remove from map after animation completes
    newStrokeTimestamps.current.delete(strokeId);
    return 1;
  };

  // Event handlers for Konva Stage (supporting both mouse and touch)
  const handleStagePointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const point = getStagePoint(e);

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

  const handleStagePointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || tool !== 'draw') return;

    const point = getStagePoint(e);
    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);

    // Broadcast drawing progress to other users
    onDrawingProgress(newStroke, userColor);
  };

  const handleStagePointerUp = () => {
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
      onDrawingComplete();
      setCurrentStroke([]);
    }
    setIsDrawing(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    // Zoom factor
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom range
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Get cursor style
  const getCursor = () => {
    if (tool === 'pan') return 'grab';
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ touchAction: 'none' }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStagePointerDown}
        onMouseMove={handleStagePointerMove}
        onMouseUp={handleStagePointerUp}
        onTouchStart={handleStagePointerDown}
        onTouchMove={handleStagePointerMove}
        onTouchEnd={handleStagePointerUp}
        onWheel={handleWheel}
        draggable={tool === 'pan'}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onDragEnd={(e) => {
          setStagePos({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        style={{ cursor: getCursor() }}
      >
        <Layer>
          {/* Render all database strokes with fade-in animation */}
          {strokes.map((stroke) => {
            const opacity = getStrokeOpacity(stroke.id);

            if (stroke.type === 'draw' && stroke.points) {
              return (
                <Line
                  key={stroke.id}
                  points={flattenPoints(stroke.points)}
                  stroke={stroke.color}
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                  opacity={opacity}
                />
              );
            } else if (stroke.type === 'text' && stroke.text && stroke.position) {
              return (
                <Text
                  key={stroke.id}
                  x={stroke.position.x}
                  y={stroke.position.y}
                  text={stroke.text}
                  fontSize={16}
                  fill={stroke.color}
                  opacity={opacity}
                />
              );
            }
            return null;
          })}

          {/* Render local strokes (optimistic UI) */}
          {localStrokes.map((stroke) => {
            if (stroke.type === 'draw' && stroke.points) {
              return (
                <Line
                  key={stroke.id}
                  points={flattenPoints(stroke.points)}
                  stroke={stroke.color}
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            } else if (stroke.type === 'text' && stroke.text && stroke.position) {
              return (
                <Text
                  key={stroke.id}
                  x={stroke.position.x}
                  y={stroke.position.y}
                  text={stroke.text}
                  fontSize={16}
                  fill={stroke.color}
                />
              );
            }
            return null;
          })}

          {/* Render other users' strokes in progress */}
          {Array.from(drawingStrokes.entries()).map(([userId, drawingStroke]) => {
            if (drawingStroke.points.length > 0) {
              return (
                <Line
                  key={`drawing-${userId}`}
                  points={flattenPoints(drawingStroke.points)}
                  stroke={drawingStroke.color}
                  strokeWidth={3}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            return null;
          })}

          {/* Render current user's stroke in progress */}
          {currentStroke.length > 0 && (
            <Line
              points={flattenPoints(currentStroke)}
              stroke={userColor}
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
