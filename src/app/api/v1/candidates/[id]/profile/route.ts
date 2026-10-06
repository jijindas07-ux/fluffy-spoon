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
        error: { code: 'NOT_FOUND', message: 'Candidate profile not found' }
      }, { status: 404 });
    }

    return NextResponse.json({
      data: candidate
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
