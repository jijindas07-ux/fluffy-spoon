import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';
import { getAIService } from '@/lib/services/aiService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const interviewId = params.id;
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId;
    const tenantId = (auth as any)?.tenantId || 'tenant-default';

    const session = await memoryStore.getSession(interviewId, userId, tenantId);
    if (!session) {
      return NextResponse.json({
        error: { code: 'NOT_FOUND', message: 'Interview session not found' }
      }, { status: 404 });
    }

    const aiService = getAIService();
    const report = await aiService.evaluateInterview(
      session.candidate,
      session.config,
      session.turns,
      session.id,
      undefined,
      1
    );

    await memoryStore.saveReport(report, userId);

    return NextResponse.json({
      data: {
        interview_id: session.id,
        status: 'completed',
        report_id: report.id,
        overall_score: report.overallScore,
        role_readiness: report.roleReadiness,
        recommendation: report.recommendation
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
