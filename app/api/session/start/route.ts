import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EXPIRY_DAYS } from '@/lib/constants';

/**
 * POST /api/session/start
 * Start a new session for a user and extend expiry of previous sessions
 * Body: { userId }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get user's last session to extend its expiry
    const { data: lastSession, error: lastSessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // If there's a previous session, extend its expiry
    if (lastSession && !lastSessionError) {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + EXPIRY_DAYS);

      await supabase
        .from('sessions')
        .update({ expiry_date: newExpiryDate.toISOString() })
        .eq('id', lastSession.id);
    }

    // Create new session
    const startedAt = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);

    const { data: newSession, error: createError } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        expiry_date: expiryDate.toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      success: true,
      session: newSession,
    });
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
