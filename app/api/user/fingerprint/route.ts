import { NextRequest, NextResponse } from 'next/server';
import { generateFingerprint } from '@/lib/fingerprint';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/user/fingerprint
 * Check if a user exists based on their fingerprint
 * Returns existing user if found, or null if not found
 */
export async function POST(request: NextRequest) {
  try {
    const { userAgent } = await request.json();

    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';

    // Generate a temporary fingerprint hash (we'll use this to check for existing users)
    // Note: We need the name to generate the final fingerprint, so for checking we use a placeholder
    const tempFingerprintData = `${ip}:${userAgent}`;

    // Return IP and userAgent for client to use when registering
    return NextResponse.json({
      success: true,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('Error in fingerprint route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process fingerprint' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/fingerprint?ip=x&userAgent=x&name=x
 * Check if a user exists with this fingerprint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');
    const userAgent = searchParams.get('userAgent');
    const name = searchParams.get('name');

    if (!ip || !userAgent || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Generate fingerprint hash
    const fingerprintHash = await generateFingerprint(name, ip, userAgent);

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      throw error;
    }

    return NextResponse.json({
      success: true,
      exists: !!user,
      user: user || null,
    });
  } catch (error) {
    console.error('Error checking fingerprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check fingerprint' },
      { status: 500 }
    );
  }
}
