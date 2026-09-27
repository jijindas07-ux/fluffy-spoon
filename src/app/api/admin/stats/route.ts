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

// GET /api/admin/stats - Platform overview statistics
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const dbStats = memoryStore.getStats();
    const authStats = authStore.getStats();
    
    const allSessions = await memoryStore.getAllSessions();
    const allCandidates = await memoryStore.getAllCandidates();
    const allReports = await memoryStore.getAllReports();
    const allUsers = authStore.getAllUsers().filter(u => u.role === 'user');

    // Recent activity (last 10 sessions)
    const recentSessions = allSessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        candidateName: s.candidate.name,
        candidateTitle: s.candidate.title,
        roleTitle: s.config.roleTitle,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        turnCount: s.turns.filter(t => t.speaker === 'candidate').length,
        hasReport: !!s.evaluationReport,
        overallScore: s.evaluationReport?.overallScore || null
      }));

    return NextResponse.json({
      success: true,
      stats: {
        platform: {
          ...dbStats,
          ...authStats
        },
        recentSessions,
        totalUsers: allUsers.length,
        users: allUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          interviewCount: u.interviewCount,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt
        }))
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
