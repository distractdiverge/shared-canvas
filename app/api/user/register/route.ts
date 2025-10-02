import { NextRequest, NextResponse } from 'next/server';
import { generateFingerprint } from '@/lib/fingerprint';
import { supabase } from '@/lib/supabase';
import { MAX_NAME_LENGTH } from '@/lib/constants';

/**
 * POST /api/user/register
 * Register a new user or retrieve existing user
 * Body: { displayName, userAgent, selectedColor }
 */
export async function POST(request: NextRequest) {
  try {
    const { displayName, userAgent, selectedColor } = await request.json();

    // Validate input
    if (!displayName || !userAgent || !selectedColor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (displayName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Name must be ${MAX_NAME_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';

    // Generate fingerprint hash
    const fingerprintHash = await generateFingerprint(displayName, ip, userAgent);

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .single();

    if (existingUser) {
      // User exists, update their color if it changed
      if (existingUser.selected_color !== selectedColor) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ selected_color: selectedColor })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return NextResponse.json({
          success: true,
          user: updatedUser,
          isNewUser: false,
        });
      }

      return NextResponse.json({
        success: true,
        user: existingUser,
        isNewUser: false,
      });
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        display_name: displayName,
        fingerprint_hash: fingerprintHash,
        selected_color: selectedColor,
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      success: true,
      user: newUser,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
