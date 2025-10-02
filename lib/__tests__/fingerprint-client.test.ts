import { getClientFingerprint } from '../fingerprint';

describe('fingerprint utilities - client', () => {
  describe('getClientFingerprint', () => {
    beforeEach(() => {
      // Mock navigator and window
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Test',
        writable: true,
        configurable: true,
      });

      Object.defineProperty(global.window, 'screen', {
        value: {
          width: 1920,
          height: 1080,
        },
        writable: true,
        configurable: true,
      });

      // Mock Intl.DateTimeFormat
      global.Intl.DateTimeFormat = jest.fn(() => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
      })) as any;
    });

    it('returns user agent from navigator', () => {
      const fingerprint = getClientFingerprint();

      expect(fingerprint.userAgent).toBe('Mozilla/5.0 Test');
    });

    it('returns screen resolution', () => {
      const fingerprint = getClientFingerprint();

      expect(fingerprint.screenResolution).toBe('1920x1080');
    });

    it('returns timezone', () => {
      const fingerprint = getClientFingerprint();

      expect(fingerprint.timezone).toBe('America/New_York');
    });

    it('returns an object with all required properties', () => {
      const fingerprint = getClientFingerprint();

      expect(fingerprint).toHaveProperty('userAgent');
      expect(fingerprint).toHaveProperty('screenResolution');
      expect(fingerprint).toHaveProperty('timezone');
    });
  });
});
