/**
 * @jest-environment node
 */
import { POST } from '../user/register/route';
import { supabase } from '@/lib/supabase';
import { MAX_NAME_LENGTH } from '@/lib/constants';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock generateFingerprint
jest.mock('@/lib/fingerprint', () => ({
  generateFingerprint: jest.fn(async (name: string, ip: string, ua: string) => {
    return `hash_${name}_${ip}_${ua}`;
  }),
}));

describe('POST /api/user/register', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    return {
      json: async () => body,
      headers: {
        get: (key: string) => headers[key] || null,
      },
    } as any;
  };

  it('creates a new user when user does not exist', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    });

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: '123', display_name: 'Alice', selected_color: '#FF6B6B' },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({ select: mockSelect }).mockReturnValueOnce({ insert: mockInsert });

    const request = createMockRequest(
      {
        displayName: 'Alice',
        userAgent: 'Mozilla/5.0',
        selectedColor: '#FF6B6B',
      },
      { 'x-forwarded-for': '192.168.1.1' }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isNewUser).toBe(true);
    expect(data.user.display_name).toBe('Alice');
  });

  it('returns existing user when fingerprint matches', async () => {
    const existingUser = {
      id: '123',
      display_name: 'Alice',
      selected_color: '#FF6B6B',
      fingerprint_hash: 'hash_Alice_192.168.1.1_Mozilla/5.0',
    };

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: existingUser, error: null }),
      }),
    });

    mockFrom.mockReturnValue({ select: mockSelect });

    const request = createMockRequest(
      {
        displayName: 'Alice',
        userAgent: 'Mozilla/5.0',
        selectedColor: '#FF6B6B',
      },
      { 'x-forwarded-for': '192.168.1.1' }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isNewUser).toBe(false);
    expect(data.user.id).toBe('123');
  });

  it('updates color when existing user changes color', async () => {
    const existingUser = {
      id: '123',
      display_name: 'Alice',
      selected_color: '#FF6B6B',
      fingerprint_hash: 'hash_Alice_192.168.1.1_Mozilla/5.0',
    };

    const updatedUser = {
      ...existingUser,
      selected_color: '#4ECDC4',
    };

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: existingUser, error: null }),
      }),
    });

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: updatedUser, error: null }),
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({ select: mockSelect }).mockReturnValueOnce({ update: mockUpdate });

    const request = createMockRequest(
      {
        displayName: 'Alice',
        userAgent: 'Mozilla/5.0',
        selectedColor: '#4ECDC4',
      },
      { 'x-forwarded-for': '192.168.1.1' }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isNewUser).toBe(false);
    expect(data.user.selected_color).toBe('#4ECDC4');
  });

  it('returns 400 when required fields are missing', async () => {
    const request = createMockRequest({
      displayName: 'Alice',
      // Missing userAgent and selectedColor
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required fields');
  });

  it('returns 400 when name exceeds max length', async () => {
    const longName = 'a'.repeat(MAX_NAME_LENGTH + 1);

    const request = createMockRequest({
      displayName: longName,
      userAgent: 'Mozilla/5.0',
      selectedColor: '#FF6B6B',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('characters or less');
  });

  it('uses default IP when headers are not present', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    });

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: '123', display_name: 'Alice', selected_color: '#FF6B6B' },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({ select: mockSelect }).mockReturnValueOnce({ insert: mockInsert });

    const request = createMockRequest({
      displayName: 'Alice',
      userAgent: 'Mozilla/5.0',
      selectedColor: '#FF6B6B',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
