/**
 * @jest-environment node
 */
import { generateFingerprint } from '../fingerprint';

describe('fingerprint utilities - server', () => {
  describe('generateFingerprint', () => {
    it('generates a consistent hash for the same inputs', async () => {
      const hash1 = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');
      const hash2 = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');

      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different names', async () => {
      const hash1 = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');
      const hash2 = await generateFingerprint('Bob', '192.168.1.1', 'Mozilla/5.0');

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for different IPs', async () => {
      const hash1 = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');
      const hash2 = await generateFingerprint('Alice', '192.168.1.2', 'Mozilla/5.0');

      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for different user agents', async () => {
      const hash1 = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');
      const hash2 = await generateFingerprint('Alice', '192.168.1.1', 'Chrome/91.0');

      expect(hash1).not.toBe(hash2);
    });

    it('generates a 64-character hex string', async () => {
      const hash = await generateFingerprint('Alice', '192.168.1.1', 'Mozilla/5.0');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('handles empty strings', async () => {
      const hash = await generateFingerprint('', '', '');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('handles special characters', async () => {
      const hash = await generateFingerprint('Alice 🎨', '192.168.1.1', 'Mozilla/5.0 (特殊)');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
