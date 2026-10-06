import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/db/client';
import { authStore } from '@/lib/auth/authStore';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

function requireAdmin(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const auth = validateToken(token);
  if (!auth || (auth.role !== 'admin' && (auth.user.role as string) !== 'tenant_admin' && (auth.user.role as string) !== 'platform_admin')) return null;
  return auth;
}

// GET /api/admin/stats - Platform overview statistics (SRS FR-019, Section 18)
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const tenantId = (auth as any)?.tenantId;
    const dbStats = memoryStore.getStats(tenantId);
    const authStats = authStore.getStats();
    
    const allSessions = await memoryStore.getAllSessions(tenantId);
    const allUsers = authStore.getAllUsers();
    const auditLogs = await memoryStore.getAuditLogs(tenantId);
    const feedback = await memoryStore.getFeedback();
    const usageRecords = await memoryStore.getAIUsage(undefined, tenantId);

    // Recent activity
    const recentSessions = allSessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 15)
      .map(s => ({
        id: s.id,
        candidateName: s.candidate.name,
        candidateTitle: s.candidate.title,
        roleTitle: s.config.roleTitle,
        status: s.status,
        currentStage: s.currentStage,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        turnCount: s.turns.filter(t => t.speaker === 'candidate').length,
        hasReport: !!s.evaluationReport,
        overallScore: s.evaluationReport?.overallScore || null,
        recommendation: s.evaluationReport?.recommendation || null,
        roleReadiness: s.evaluationReport?.roleReadiness || null
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
        auditLogs: auditLogs.slice(-20).reverse(),
        feedbackSummary: {
          total: feedback.length,
          avgRating: feedback.length > 0 ? Number((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)) : 5.0
        },
        users: allUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
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
