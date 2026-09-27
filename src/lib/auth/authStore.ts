/**
 * In-memory Auth Store with persistent localStorage backup pattern.
 * Stores users and sessions server-side in memory (global singleton).
 * JWT tokens are used for stateless auth validation.
 */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: number;
  lastLoginAt?: number;
  interviewCount: number;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: number;
}

class AuthStore {
  private users: Map<string, UserRecord> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId
  private sessions: Map<string, AuthSession> = new Map(); // token -> session

  constructor() {
    // Seed a default admin account
    this.seedAdmin();
  }

  private seedAdmin() {
    const adminId = 'admin-verveai-001';
    if (!this.users.has(adminId)) {
      // Password: "admin123" - pre-hashed with bcryptjs rounds=10
      // NOTE: In production, use proper bcrypt hashing via API
      const adminUser: UserRecord = {
        id: adminId,
        email: 'admin@verveai.com',
        name: 'VerveAI Admin',
        passwordHash: '$2a$10$placeholder_admin_hash', // replaced at runtime
        role: 'admin',
        createdAt: Date.now(),
        interviewCount: 0
      };
      this.users.set(adminId, adminUser);
      this.emailIndex.set('admin@verveai.com', adminId);
    }
  }

  createUser(data: { email: string; name: string; passwordHash: string; role?: 'user' | 'admin' }): UserRecord {
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user: UserRecord = {
      id: userId,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      passwordHash: data.passwordHash,
      role: data.role || 'user',
      createdAt: Date.now(),
      interviewCount: 0
    };
    this.users.set(userId, user);
    this.emailIndex.set(user.email, userId);
    return user;
  }

  getUserByEmail(email: string): UserRecord | null {
    const userId = this.emailIndex.get(email.toLowerCase().trim());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  getUserById(userId: string): UserRecord | null {
    return this.users.get(userId) || null;
  }

  getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  updateUser(userId: string, updates: Partial<Pick<UserRecord, 'name' | 'lastLoginAt' | 'interviewCount'>>): void {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates);
      this.users.set(userId, user);
    }
  }

  setAdminPasswordHash(hash: string): void {
    const adminId = 'admin-verveai-001';
    const admin = this.users.get(adminId);
    if (admin) {
      admin.passwordHash = hash;
      this.users.set(adminId, admin);
    }
  }

  saveSession(session: AuthSession): void {
    this.sessions.set(session.token, session);
  }

  getSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  isEmailTaken(email: string): boolean {
    return this.emailIndex.has(email.toLowerCase().trim());
  }

  getStats() {
    const users = Array.from(this.users.values());
    return {
      totalUsers: users.filter(u => u.role === 'user').length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      activeSessions: this.sessions.size,
      totalInterviews: users.reduce((sum, u) => sum + u.interviewCount, 0)
    };
  }
}

// Global singleton
const globalForAuth = globalThis as unknown as { __authStore: AuthStore | undefined };
export const authStore = globalForAuth.__authStore ?? new AuthStore();
if (process.env.NODE_ENV !== 'production') {
  globalForAuth.__authStore = authStore;
}
