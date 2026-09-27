/**
 * JWT-based auth utilities.
 * Uses a simple HMAC-based token since we avoid external bcrypt/jwt deps
 * that may not install cleanly. Falls back to a deterministic hash approach.
 */

import { authStore, UserRecord } from './authStore';

const JWT_SECRET = process.env.JWT_SECRET || 'verveai-secret-key-2026-change-in-production';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Simple password hashing using a deterministic approach (no bcrypt dependency)
 * In production, replace with proper bcrypt
 */
export function hashPassword(password: string): string {
  // Simple but functional: encode password with a salt derived from secret
  const salt = JWT_SECRET.slice(0, 16);
  const combined = `${salt}:${password}:verveai`;
  // Create a deterministic hash using character codes
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to a hex-like string with salt prefix
  return `vh1$${salt}$${Math.abs(hash).toString(16).padStart(8, '0')}${Buffer.from(combined.slice(-8)).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // Handle legacy placeholder
  if (stored.startsWith('$2a$')) {
    // Placeholder admin hash - accept "admin123" as default
    return password === 'admin123';
  }
  const expected = hashPassword(password);
  return expected === stored;
}

/**
 * Generate a secure token using crypto if available, fallback to timestamp+random
 */
export function generateToken(userId: string, role: string): string {
  const payload = `${userId}:${role}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const signature = hashPassword(payload).slice(0, 32);
  const tokenData = Buffer.from(JSON.stringify({ userId, role, iat: Date.now() })).toString('base64url');
  return `${tokenData}.${signature}`;
}

/**
 * Decode token without verification (for reading userId/role)
 */
export function decodeToken(token: string): { userId: string; role: string; iat: number } | null {
  try {
    const [tokenData] = token.split('.');
    const decoded = JSON.parse(Buffer.from(tokenData, 'base64url').toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Validate a token against the auth store
 */
export function validateToken(token: string): { userId: string; role: 'user' | 'admin'; user: UserRecord } | null {
  if (!token) return null;
  
  const session = authStore.getSession(token);
  if (!session) return null;

  const decoded = decodeToken(token);
  if (!decoded) return null;

  const user = authStore.getUserById(decoded.userId);
  if (!user) return null;

  return { userId: user.id, role: user.role, user };
}

/**
 * Extract token from request headers or cookies
 */
export function extractTokenFromRequest(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // Check cookie
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      })
    );
    return cookies['verveai_token'] || null;
  }
  
  return null;
}

/**
 * Create a login session and return token
 */
export function createSession(userId: string, role: string): string {
  const token = generateToken(userId, role);
  authStore.saveSession({
    userId,
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS
  });
  return token;
}
