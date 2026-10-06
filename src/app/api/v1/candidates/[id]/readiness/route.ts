import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const candidateId = params.id;
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId;
    const tenantId = (auth as any)?.tenantId || 'tenant-default';

    const candidate = await memoryStore.getCandidate(candidateId, userId, tenantId);
    if (!candidate) {
      return NextResponse.json({
        error: { code: 'NOT_FOUND', message: 'Candidate not found' }
      }, { status: 404 });
    }

    const allSessions = await memoryStore.getAllSessions(tenantId);
    const candidateSessions = allSessions.filter(s => s.candidate.id === candidateId && s.status === 'completed' && s.evaluationReport);

    const readinessHistory = candidateSessions.map(s => ({
      interview_id: s.id,
      completed_at: s.completedAt,
      role_title: s.config.roleTitle,
      overall_score: s.evaluationReport?.overallScore,
      role_readiness: s.evaluationReport?.roleReadiness,
      recommendation: s.evaluationReport?.recommendation,
      dimensions: s.evaluationReport?.dimensions
    }));

    return NextResponse.json({
      data: {
        candidate_id: candidate.id,
        candidate_name: candidate.name,
        total_interviews: candidateSessions.length,
        latest_readiness: candidateSessions[candidateSessions.length - 1]?.evaluationReport?.roleReadiness || 'Not Evaluated',
        history: readinessHistory
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
