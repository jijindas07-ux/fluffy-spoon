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

  async saveCandidate(candidate: CandidateProfile): Promise<CandidateProfile> {
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  async getCandidate(id: string): Promise<CandidateProfile | null> {
    return this.candidates.get(id) || null;
  }

  async saveSession(session: InterviewSession): Promise<InterviewSession> {
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<InterviewSession | null> {
    return this.sessions.get(id) || null;
  }

  async addTurnToSession(sessionId: string, turn: ConversationTurn): Promise<InterviewSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.turns.push(turn);
    this.sessions.set(sessionId, session);
    return session;
  }

  async saveReport(report: EvaluationReport): Promise<EvaluationReport> {
    this.reports.set(report.id, report);
    const session = this.sessions.get(report.sessionId);
    if (session) {
      session.evaluationReport = report;
      session.status = 'completed';
      session.completedAt = Date.now();
      this.sessions.set(report.sessionId, session);
    }
    return report;
  }

  async getReport(id: string): Promise<EvaluationReport | null> {
    return this.reports.get(id) || null;
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
