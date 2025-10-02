import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EXPIRY_DAYS } from '@/lib/constants';

/**
 * POST /api/session/end
 * End a user's session and set expiry date
 * Body: { sessionId }
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const endedAt = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    // Update session with end time and expiry date
    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        ended_at: endedAt.toISOString(),
        expiry_date: expiryDate.toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    // Update user's last_session_end
    await supabase
      .from('users')
      .update({ last_session_end: endedAt.toISOString() })
      .eq('id', updatedSession.user_id);

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
