/**
 * Generate a fingerprint hash based on user's name, IP, and User Agent
 * Note: IP address will be captured server-side
 */
export async function generateFingerprint(
  displayName: string,
  ipAddress: string,
  userAgent: string
): Promise<string> {
  const data = `${displayName}:${ipAddress}:${userAgent}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get client-side fingerprint components
 */
export function getClientFingerprint() {
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
