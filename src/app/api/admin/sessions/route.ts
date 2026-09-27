import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { authStore } from '@/lib/auth/authStore';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

function requireAdmin(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const auth = validateToken(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

// GET /api/admin/sessions - All sessions with full detail
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const allSessions = await memoryStore.getAllSessions();
    const sessions = allSessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(s => {
        const sessionAny = s as any;
        return {
          id: s.id,
          userId: sessionAny._userId || null,
          candidateName: s.candidate.name,
          candidateTitle: s.candidate.title,
          candidateId: s.candidate.id,
          roleTitle: s.config.roleTitle,
          seniority: s.config.seniority,
          focusArea: s.config.focusArea,
          rigorLevel: s.config.rigorLevel,
          status: s.status,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          turnCount: s.turns.filter(t => t.speaker === 'candidate').length,
          totalTurns: s.turns.length,
          hasReport: !!s.evaluationReport,
          overallScore: s.evaluationReport?.overallScore || null,
          recommendation: s.evaluationReport?.recommendation || null,
          parserSource: s.candidate.parserSource || 'unknown'
        };
      });

    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
