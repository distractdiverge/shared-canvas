/**
 * @jest-environment node
 */
import { POST as startSession } from '../session/start/route';
import { POST as endSession } from '../session/end/route';
import { supabase } from '@/lib/supabase';
import { EXPIRY_DAYS } from '@/lib/constants';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Session API Routes', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: async () => body,
    } as any;
  };

  describe('POST /api/session/start', () => {
    it('creates a new session for a user', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'session-123',
              user_id: 'user-123',
              started_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({ select: mockSelect }).mockReturnValueOnce({ insert: mockInsert });

      const request = createMockRequest({ userId: 'user-123' });
      const response = await startSession(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.id).toBe('session-123');
    });

    it('extends expiry of previous session when starting new session', async () => {
      const lastSession = {
        id: 'old-session-123',
        user_id: 'user-123',
        started_at: new Date().toISOString(),
      };

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: lastSession, error: null }),
            }),
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: lastSession, error: null }),
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'new-session-456', user_id: 'user-123' },
            error: null,
          }),
        }),
      });

      mockFrom
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ update: mockUpdate })
        .mockReturnValueOnce({ insert: mockInsert });

      const request = createMockRequest({ userId: 'user-123' });
      const response = await startSession(request);
      const data = await response.json();

      expect(mockUpdate).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 400 when userId is missing', async () => {
      const request = createMockRequest({});
      const response = await startSession(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing userId');
    });
  });

  describe('POST /api/session/end', () => {
    it('ends a session and sets expiry date', async () => {
      const endedSession = {
        id: 'session-123',
        user_id: 'user-123',
        ended_at: new Date().toISOString(),
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: endedSession, error: null }),
          }),
        }),
      });

      const mockUserUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      mockFrom.mockReturnValueOnce({ update: mockUpdate }).mockReturnValueOnce({ update: mockUserUpdate });

      const request = createMockRequest({ sessionId: 'session-123' });
      const response = await endSession(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session.id).toBe('session-123');
    });

    it('updates user last_session_end when ending session', async () => {
      const endedSession = {
        id: 'session-123',
        user_id: 'user-123',
        ended_at: new Date().toISOString(),
      };

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: endedSession, error: null }),
          }),
        }),
      });

      const mockUserUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      mockFrom.mockReturnValueOnce({ update: mockUpdate }).mockReturnValueOnce({ update: mockUserUpdate });

      const request = createMockRequest({ sessionId: 'session-123' });
      await endSession(request);

      expect(mockUserUpdate).toHaveBeenCalledWith({ last_session_end: expect.any(String) });
    });

    it('returns 400 when sessionId is missing', async () => {
      const request = createMockRequest({});
      const response = await endSession(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing sessionId');
    });
  });
});
