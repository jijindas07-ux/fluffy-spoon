import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

// GET /api/user/interviews/[sessionId] - Get full interview session for current user
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const auth = validateToken(token);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 });
    }

    const session = await memoryStore.getSession(params.sessionId, auth.userId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
