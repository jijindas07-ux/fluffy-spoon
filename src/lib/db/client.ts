import { Pool } from 'pg';
import { CandidateProfile, ConversationTurn, EvaluationReport, InterviewConfig, InterviewSession } from '../types';

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// In-Memory fallback store for local development or demo execution
class MemoryStorage {
  private candidates: Map<string, CandidateProfile> = new Map();
  private sessions: Map<string, InterviewSession> = new Map();
  private reports: Map<string, EvaluationReport> = new Map();

  // User-scoped indexes for data isolation
  private candidatesByUser: Map<string, Set<string>> = new Map(); // userId -> Set<candidateId>
  private sessionsByUser: Map<string, Set<string>> = new Map(); // userId -> Set<sessionId>

  async saveCandidate(candidate: CandidateProfile, userId?: string): Promise<CandidateProfile> {
    // Tag candidate with userId
    const taggedCandidate = userId ? { ...candidate, _userId: userId } : candidate;
    this.candidates.set(candidate.id, taggedCandidate as CandidateProfile);
    if (userId) {
      if (!this.candidatesByUser.has(userId)) this.candidatesByUser.set(userId, new Set());
      this.candidatesByUser.get(userId)!.add(candidate.id);
    }
    return candidate;
  }

  async getCandidate(id: string, userId?: string): Promise<CandidateProfile | null> {
    const candidate = this.candidates.get(id);
    if (!candidate) return null;
    // Enforce user isolation: if userId given, only return if it matches or candidate has no userId
    const c = candidate as any;
    if (userId && c._userId && c._userId !== userId) return null;
    return candidate;
  }

  async getCandidatesByUser(userId: string): Promise<CandidateProfile[]> {
    const ids = this.candidatesByUser.get(userId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.candidates.get(id))
      .filter(Boolean) as CandidateProfile[];
  }

  async saveSession(session: InterviewSession, userId?: string): Promise<InterviewSession> {
    const taggedSession = userId ? { ...session, _userId: userId } : session;
    this.sessions.set(session.id, taggedSession as InterviewSession);
    if (userId) {
      if (!this.sessionsByUser.has(userId)) this.sessionsByUser.set(userId, new Set());
      this.sessionsByUser.get(userId)!.add(session.id);
    }
    return session;
  }

  async getSession(id: string, userId?: string): Promise<InterviewSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    const s = session as any;
    if (userId && s._userId && s._userId !== userId) return null;
    return session;
  }

  async getSessionsByUser(userId: string): Promise<InterviewSession[]> {
    const ids = this.sessionsByUser.get(userId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.sessions.get(id))
      .filter(Boolean) as InterviewSession[];
  }

  async getAllSessions(): Promise<InterviewSession[]> {
    return Array.from(this.sessions.values());
  }

  async getAllCandidates(): Promise<CandidateProfile[]> {
    return Array.from(this.candidates.values());
  }

  async addTurnToSession(sessionId: string, turn: ConversationTurn, userId?: string): Promise<InterviewSession | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session) return null;
    session.turns.push(turn);
    this.sessions.set(sessionId, session);
    return session;
  }

  async saveReport(report: EvaluationReport, userId?: string): Promise<EvaluationReport> {
    this.reports.set(report.id, report);
    const session = await this.getSession(report.sessionId, userId);
    if (session) {
      session.evaluationReport = report;
      session.status = 'completed';
      session.completedAt = Date.now();
      this.sessions.set(report.sessionId, session);
    }
    return report;
  }

  async getReport(id: string, userId?: string): Promise<EvaluationReport | null> {
    const report = this.reports.get(id);
    if (!report) return null;
    // Validate access via session
    if (userId) {
      const session = this.sessions.get(report.sessionId) as any;
      if (session?._userId && session._userId !== userId) return null;
    }
    return report;
  }

  async getAllReports(): Promise<EvaluationReport[]> {
    return Array.from(this.reports.values());
  }

  getStats() {
    const sessions = Array.from(this.sessions.values());
    return {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      inProgressSessions: sessions.filter(s => s.status === 'in_progress').length,
      totalCandidates: this.candidates.size,
      totalReports: this.reports.size
    };
  }
}

// Global singleton pattern for Next.js development server
const globalForStore = globalThis as unknown as {
  __memoryStore: MemoryStorage | undefined;
};

export const memoryStore = globalForStore.__memoryStore ?? new MemoryStorage();

if (process.env.NODE_ENV !== 'production') {
  globalForStore.__memoryStore = memoryStore;
}

export const db = {
  async query(text: string, params?: any[]) {
    if (!pool) {
      // In-memory mode
      return { rows: [] };
    }
    return pool.query(text, params);
  },
  isPostgresConnected(): boolean {
    return !!pool;
  }
};
