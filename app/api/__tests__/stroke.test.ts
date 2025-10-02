/**
 * @jest-environment node
 */
import { POST, GET } from '../stroke/route';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Stroke API Routes', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: async () => body,
    } as any;
  };

  describe('POST /api/stroke', () => {
    it('creates a drawing stroke', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'stroke-123',
              type: 'draw',
              points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
              color: '#FF6B6B',
            },
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValue({ insert: mockInsert });

      const request = createMockRequest({
        userId: 'user-123',
        sessionId: 'session-123',
        type: 'draw',
        points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
        color: '#FF6B6B',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stroke.type).toBe('draw');
      expect(data.stroke.points).toHaveLength(2);
    });

    it('creates a text stroke', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'stroke-456',
              type: 'text',
              text: 'Hello World',
              position: { x: 100, y: 100 },
              color: '#4ECDC4',
            },
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValue({ insert: mockInsert });

      const request = createMockRequest({
        userId: 'user-123',
        sessionId: 'session-123',
        type: 'text',
        text: 'Hello World',
        position: { x: 100, y: 100 },
        color: '#4ECDC4',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stroke.type).toBe('text');
      expect(data.stroke.text).toBe('Hello World');
    });

    it('returns 400 when required fields are missing', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        // Missing sessionId, type, color
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('returns 400 when draw type is missing points', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        sessionId: 'session-123',
        type: 'draw',
        color: '#FF6B6B',
        // Missing points
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Points required for draw type');
    });

    it('returns 400 when text type is missing text or position', async () => {
      const request = createMockRequest({
        userId: 'user-123',
        sessionId: 'session-123',
        type: 'text',
        color: '#FF6B6B',
        // Missing text and position
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Text and position required for text type');
    });
  });

  describe('GET /api/stroke', () => {
    it('retrieves all strokes with user information', async () => {
      const mockStrokes = [
        {
          id: 'stroke-1',
          type: 'draw',
          color: '#FF6B6B',
          users: { display_name: 'Alice', selected_color: '#FF6B6B' },
        },
        {
          id: 'stroke-2',
          type: 'text',
          color: '#4ECDC4',
          users: { display_name: 'Bob', selected_color: '#4ECDC4' },
        },
      ];

      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockStrokes,
          error: null,
        }),
      });

      mockFrom.mockReturnValue({ select: mockSelect });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.strokes).toHaveLength(2);
      expect(data.strokes[0].users.display_name).toBe('Alice');
    });

    it('returns empty array when no strokes exist', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockFrom.mockReturnValue({ select: mockSelect });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.strokes).toEqual([]);
    });

    it('orders strokes by created_at ascending', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      mockFrom.mockReturnValue({ select: mockSelect });

      await GET();

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });
});
