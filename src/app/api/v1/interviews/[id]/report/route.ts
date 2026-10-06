import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    if (!session.evaluationReport) {
      return NextResponse.json({
        error: { code: 'REPORT_NOT_READY', message: 'Evaluation report has not been generated yet.' }
      }, { status: 404 });
    }

    return NextResponse.json({
      data: session.evaluationReport
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
