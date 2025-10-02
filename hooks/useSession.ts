import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@/lib/types';
import { getClientFingerprint } from '@/lib/fingerprint';

interface UseSessionReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  registerUser: (displayName: string, selectedColor: string) => Promise<void>;
  endSession: () => Promise<void>;
}

/**
 * Hook to manage user session lifecycle
 * Handles user registration, session start/end, and cleanup
 */
export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register or login user and start a new session
   */
  const registerUser = useCallback(async (displayName: string, selectedColor: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get client fingerprint data
      const clientData = getClientFingerprint();

      // Register/login user
      const registerResponse = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          userAgent: clientData.userAgent,
          selectedColor,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register user');
      }

      const registerData = await registerResponse.json();

      if (!registerData.success) {
        throw new Error(registerData.error || 'Registration failed');
      }

      setUser(registerData.user);

      // Start a new session
      const sessionResponse = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registerData.user.id }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to start session');
      }

      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Session start failed');
      }

      setSession(sessionData.session);

      // Store session ID in sessionStorage for persistence across refreshes
      sessionStorage.setItem('sessionId', sessionData.session.id);
      sessionStorage.setItem('userId', registerData.user.id);
      sessionStorage.setItem('userName', registerData.user.display_name);
      sessionStorage.setItem('userColor', registerData.user.selected_color);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Session error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        console.error('Failed to end session');
      }

      // Clear session storage
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('userColor');

      setSession(null);
      setUser(null);
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, [session]);

  /**
   * Load session from sessionStorage on mount
   */
  useEffect(() => {
    const sessionId = sessionStorage.getItem('sessionId');
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    const userColor = sessionStorage.getItem('userColor');

    if (sessionId && userId && userName && userColor) {
      // Restore session from storage
      setUser({
        id: userId,
        display_name: userName,
        selected_color: userColor,
        fingerprint_hash: '',
        last_session_end: null,
        created_at: '',
      });

      setSession({
        id: sessionId,
        user_id: userId,
        started_at: new Date().toISOString(),
        ended_at: null,
        expiry_date: '',
        created_at: '',
      });
    }
  }, []);

  /**
   * Handle page unload - end session
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session) {
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({ sessionId: session.id });
        navigator.sendBeacon('/api/session/end', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  return {
    user,
    session,
    loading,
    error,
    registerUser,
    endSession,
  };
}
