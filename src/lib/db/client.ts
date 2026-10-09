import { Pool } from 'pg';
import {
  AIUsageRecord,
  AuditLogRecord,
  CandidateFeedback,
  CandidateProfile,
  ConversationTurn,
  EvaluationReport,
  InterviewConfig,
  InterviewSession,
  JobDescription
} from '../types';

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

export interface TenantRecord {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'trial';
  settingsJson: {
    retentionDays: number;
    quotaMonthlyInterviews: number;
    allowedProviders: string[];
  };
  createdAt: number;
}

// In-Memory Storage supporting full Alphagrew SRS Entities & Tenant Scoping
class MemoryStorage {
  private tenants: Map<string, TenantRecord> = new Map();
  private candidates: Map<string, CandidateProfile> = new Map();
  private jobDescriptions: Map<string, JobDescription> = new Map();
  private sessions: Map<string, InterviewSession> = new Map();
  private reports: Map<string, EvaluationReport> = new Map();
  private aiUsageRecords: AIUsageRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private feedbackRecords: CandidateFeedback[] = [];
  // SHA-256 Content-Hash Resume Cache (SRS FR-002)
  private resumeCache: Map<string, CandidateProfile> = new Map();

  // Scoped indexes
  private candidatesByUser: Map<string, Set<string>> = new Map(); // userId -> Set<candidateId>
  private sessionsByUser: Map<string, Set<string>> = new Map(); // userId -> Set<sessionId>
  private sessionsByTenant: Map<string, Set<string>> = new Map(); // tenantId -> Set<sessionId>

  saveCachedResume(sha256: string, profile: CandidateProfile) {
    this.resumeCache.set(sha256, JSON.parse(JSON.stringify(profile)));
  }

  getCachedResume(sha256: string): CandidateProfile | null {
    const cached = this.resumeCache.get(sha256);
    if (!cached) return null;
    const freshId = `cand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cloned: CandidateProfile = JSON.parse(JSON.stringify(cached));
    cloned.id = freshId;
    cloned.claims = (cloned.claims || []).map((c, i) => ({
      ...c,
      id: `claim-${i + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    }));
    if (cloned.extractedKeywords) {
      cloned.extractedKeywords = cloned.extractedKeywords.map((k, i) => ({
        ...k,
        id: `kw-${i + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
      }));
    }
    return cloned;
  }

  constructor() {
    // Seed default institution/tenant
    const defaultTenant: TenantRecord = {
      id: 'tenant-default',
      name: 'Alphagrew Campus Alpha',
      status: 'active',
      settingsJson: {
        retentionDays: 90,
        quotaMonthlyInterviews: 1000,
        allowedProviders: ['gemini', 'openai', 'groq']
      },
      createdAt: Date.now()
    };
    this.tenants.set(defaultTenant.id, defaultTenant);
  }

  // ─── TENANTS ──────────────────────────────────────────────────────
  async getTenant(id: string): Promise<TenantRecord | null> {
    return this.tenants.get(id) || null;
  }

  async getAllTenants(): Promise<TenantRecord[]> {
    return Array.from(this.tenants.values());
  }

  async saveTenant(tenant: TenantRecord): Promise<TenantRecord> {
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  // ─── CANDIDATES & PROFILES ─────────────────────────────────────────
  async saveCandidate(candidate: CandidateProfile, userId?: string, tenantId?: string): Promise<CandidateProfile> {
    const taggedCandidate = {
      ...candidate,
      tenantId: tenantId || candidate.tenantId || 'tenant-default',
      _userId: userId
    };
    this.candidates.set(candidate.id, taggedCandidate as CandidateProfile);
    if (userId) {
      if (!this.candidatesByUser.has(userId)) this.candidatesByUser.set(userId, new Set());
      this.candidatesByUser.get(userId)!.add(candidate.id);
    }
    return taggedCandidate;
  }

  async getCandidate(id: string, userId?: string, tenantId?: string): Promise<CandidateProfile | null> {
    const candidate = this.candidates.get(id);
    if (!candidate) return null;
    const c = candidate as any;
    if (userId && c._userId && c._userId !== userId) return null;
    if (tenantId && c.tenantId && c.tenantId !== tenantId) return null;
    return candidate;
  }

  async getCandidatesByUser(userId: string): Promise<CandidateProfile[]> {
    const ids = this.candidatesByUser.get(userId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.candidates.get(id))
      .filter(Boolean) as CandidateProfile[];
  }

  async getAllCandidates(tenantId?: string): Promise<CandidateProfile[]> {
    const all = Array.from(this.candidates.values());
    if (!tenantId) return all;
    return all.filter(c => c.tenantId === tenantId);
  }

  // ─── JOB DESCRIPTIONS ─────────────────────────────────────────────
  async saveJobDescription(jd: JobDescription): Promise<JobDescription> {
    this.jobDescriptions.set(jd.id, jd);
    return jd;
  }

  async getJobDescription(id: string): Promise<JobDescription | null> {
    return this.jobDescriptions.get(id) || null;
  }

  async getAllJobDescriptions(tenantId?: string): Promise<JobDescription[]> {
    const all = Array.from(this.jobDescriptions.values());
    if (!tenantId) return all;
    return all.filter(jd => !jd.tenantId || jd.tenantId === tenantId);
  }

  // ─── SESSIONS ─────────────────────────────────────────────────────
  async saveSession(session: InterviewSession, userId?: string, tenantId?: string): Promise<InterviewSession> {
    const taggedSession = {
      ...session,
      tenantId: tenantId || session.tenantId || 'tenant-default',
      _userId: userId
    };
    this.sessions.set(session.id, taggedSession as InterviewSession);

    if (userId) {
      if (!this.sessionsByUser.has(userId)) this.sessionsByUser.set(userId, new Set());
      this.sessionsByUser.get(userId)!.add(session.id);
    }

    const tId = taggedSession.tenantId;
    if (tId) {
      if (!this.sessionsByTenant.has(tId)) this.sessionsByTenant.set(tId, new Set());
      this.sessionsByTenant.get(tId)!.add(session.id);
    }

    return taggedSession;
  }

  async getSession(id: string, userId?: string, tenantId?: string): Promise<InterviewSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    const s = session as any;
    if (userId && s._userId && s._userId !== userId) return null;
    if (tenantId && s.tenantId && s.tenantId !== tenantId) return null;
    return session;
  }

  async getSessionsByUser(userId: string): Promise<InterviewSession[]> {
    const ids = this.sessionsByUser.get(userId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.sessions.get(id))
      .filter(Boolean) as InterviewSession[];
  }

  async getAllSessions(tenantId?: string): Promise<InterviewSession[]> {
    const all = Array.from(this.sessions.values());
    if (!tenantId) return all;
    return all.filter(s => s.tenantId === tenantId);
  }

  // ─── REPORTS ──────────────────────────────────────────────────────
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
    if (userId) {
      const session = this.sessions.get(report.sessionId) as any;
      if (session?._userId && session._userId !== userId) return null;
    }
    return report;
  }

  async getAllReports(tenantId?: string): Promise<EvaluationReport[]> {
    const all = Array.from(this.reports.values());
    if (!tenantId) return all;
    return all.filter(r => {
      const sess = this.sessions.get(r.sessionId);
      return sess?.tenantId === tenantId;
    });
  }

  // ─── AI USAGE TELEMETRY ───────────────────────────────────────────
  async recordAIUsage(record: AIUsageRecord): Promise<AIUsageRecord> {
    this.aiUsageRecords.push(record);
    if (record.interviewId) {
      const sess = this.sessions.get(record.interviewId);
      if (sess) {
        if (!sess.usageRecords) sess.usageRecords = [];
        sess.usageRecords.push(record);
      }
    }
    return record;
  }

  async getAIUsage(interviewId?: string, tenantId?: string): Promise<AIUsageRecord[]> {
    let filtered = this.aiUsageRecords;
    if (interviewId) filtered = filtered.filter(r => r.interviewId === interviewId);
    if (tenantId) filtered = filtered.filter(r => r.tenantId === tenantId);
    return filtered;
  }

  // ─── AUDIT LOGS ───────────────────────────────────────────────────
  async logAuditEvent(event: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const log: AuditLogRecord = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    };
    this.auditLogs.push(log);
    return log;
  }

  async getAuditLogs(tenantId?: string): Promise<AuditLogRecord[]> {
    if (!tenantId) return this.auditLogs;
    return this.auditLogs.filter(l => !l.tenantId || l.tenantId === tenantId);
  }

  // ─── CANDIDATE FEEDBACK ───────────────────────────────────────────
  async saveFeedback(feedback: CandidateFeedback): Promise<CandidateFeedback> {
    this.feedbackRecords.push(feedback);
    return feedback;
  }

  async getFeedback(interviewId?: string): Promise<CandidateFeedback[]> {
    if (!interviewId) return this.feedbackRecords;
    return this.feedbackRecords.filter(f => f.interviewId === interviewId);
  }

  // ─── STATS ────────────────────────────────────────────────────────
  getStats(tenantId?: string) {
    const allSessions = this.getAllSessionsSync(tenantId);
    const totalTokens = this.aiUsageRecords
      .filter(r => !tenantId || r.tenantId === tenantId)
      .reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
    const totalCostUsd = this.aiUsageRecords
      .filter(r => !tenantId || r.tenantId === tenantId)
      .reduce((sum, r) => sum + r.estimatedCostUsd, 0);

    return {
      totalSessions: allSessions.length,
      completedSessions: allSessions.filter(s => s.status === 'completed').length,
      inProgressSessions: allSessions.filter(s => s.status === 'in_progress').length,
      totalCandidates: this.candidates.size,
      totalReports: this.reports.size,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      totalFeedback: this.feedbackRecords.length
    };
  }

  private getAllSessionsSync(tenantId?: string): InterviewSession[] {
    const all = Array.from(this.sessions.values());
    if (!tenantId) return all;
    return all.filter(s => s.tenantId === tenantId);
  }
}

// Global singleton pattern
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
      return { rows: [] };
    }
    return pool.query(text, params);
  },
  isPostgresConnected(): boolean {
    return !!pool;
  }
};
