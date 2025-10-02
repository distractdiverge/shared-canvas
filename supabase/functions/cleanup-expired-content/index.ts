import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Edge Function to clean up expired content
 * This function should be scheduled to run daily via Supabase cron
 */
Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete strokes from expired sessions
    const { data: expiredSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .lt('expiry_date', new Date().toISOString());

    if (sessionsError) {
      throw sessionsError;
    }

    if (expiredSessions && expiredSessions.length > 0) {
      const sessionIds = expiredSessions.map(s => s.id);

      // Delete strokes
      const { error: strokesError } = await supabase
        .from('strokes')
        .delete()
        .in('session_id', sessionIds);

      if (strokesError) {
        throw strokesError;
      }

      // Delete sessions
      const { error: deleteSessionsError } = await supabase
        .from('sessions')
        .delete()
        .in('id', sessionIds);

      if (deleteSessionsError) {
        throw deleteSessionsError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          deletedSessions: expiredSessions.length,
          message: `Cleaned up ${expiredSessions.length} expired sessions`
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedSessions: 0,
        message: 'No expired sessions found'
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
