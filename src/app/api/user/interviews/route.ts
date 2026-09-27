import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

// GET /api/user/interviews - Get all interviews for the current user
export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const auth = validateToken(token);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 });
    }

    const sessions = await memoryStore.getSessionsByUser(auth.userId);
    
    // Return summarized session data (not full turns to keep payload small)
    const summaries = sessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(s => ({
        id: s.id,
        candidateName: s.candidate.name,
        candidateTitle: s.candidate.title,
        roleTitle: s.config.roleTitle,
        seniority: s.config.seniority,
        focusArea: s.config.focusArea,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        turnCount: s.turns.filter(t => t.speaker === 'candidate').length,
        hasReport: !!s.evaluationReport,
        overallScore: s.evaluationReport?.overallScore || null,
        recommendation: s.evaluationReport?.recommendation || null
      }));

    return NextResponse.json({ success: true, interviews: summaries });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
