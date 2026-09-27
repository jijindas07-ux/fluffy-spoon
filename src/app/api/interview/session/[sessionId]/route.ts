import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

// GET /api/interview/session/[sessionId] - Resume an in-progress interview
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = extractTokenFromRequest(req);
    const auth = token ? validateToken(token) : null;
    const userId = auth?.userId || null;

    const session = await memoryStore.getSession(params.sessionId, userId || undefined);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
