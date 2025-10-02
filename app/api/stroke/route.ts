import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/stroke
 * Save a new stroke (drawing or text) to the database
 * Body: { userId, sessionId, type, points?, color, text?, position? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;
    const sessionId = body.sessionId || body.session_id;
    const { type, points, color, text, position } = body;

    // Validate required fields
    if (!userId || !sessionId || !type || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type-specific fields
    if (type === 'draw' && !points) {
      return NextResponse.json(
        { success: false, error: 'Points required for draw type' },
        { status: 400 }
      );
    }

    if (type === 'text' && (!text || !position)) {
      return NextResponse.json(
        { success: false, error: 'Text and position required for text type' },
        { status: 400 }
      );
    }

    // Insert stroke
    const { data: newStroke, error } = await supabase
      .from('strokes')
      .insert({
        user_id: userId,
        session_id: sessionId,
        type,
        points: points || null,
        color,
        text: text || null,
        position: position || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      stroke: newStroke,
    });
  } catch (error) {
    console.error('Error saving stroke:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save stroke' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stroke
 * Get all strokes for the canvas
 */
export async function GET() {
  try {
    const { data: strokes, error } = await supabase
      .from('strokes')
      .select(`
        *,
        users:user_id (
          display_name,
          selected_color
        )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      strokes: strokes || [],
    });
  } catch (error) {
    console.error('Error fetching strokes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch strokes' },
      { status: 500 }
    );
  }
}
