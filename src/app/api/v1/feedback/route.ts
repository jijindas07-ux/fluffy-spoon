import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { extractTokenFromRequest, validateToken } from '@/lib/auth/authUtils';
import { CandidateFeedback } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interview_id, rating, flag_type, comments } = body;

    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId;
    const tenantId = (auth as any)?.tenantId || 'tenant-default';

    if (!interview_id || rating === undefined) {
      return NextResponse.json({
        error: { code: 'INVALID_ARGUMENT', message: 'interview_id and rating are required' }
      }, { status: 400 });
    }

    const feedback: CandidateFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      interviewId: interview_id,
      tenantId,
      userId,
      rating: Number(rating),
      flagType: flag_type,
      comments: comments || '',
      createdAt: Date.now()
    };

    await memoryStore.saveFeedback(feedback);

    return NextResponse.json({
      data: feedback
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
