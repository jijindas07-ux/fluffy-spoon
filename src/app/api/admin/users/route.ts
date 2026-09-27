import { NextRequest, NextResponse } from 'next/server';
import { authStore } from '@/lib/auth/authStore';
import { memoryStore } from '@/lib/db/client';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';

function requireAdmin(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const auth = validateToken(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

// GET /api/admin/users - All users list
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const allUsers = authStore.getAllUsers();
    const allSessions = await memoryStore.getAllSessions();

    const users = allUsers.map(u => {
      const userSessions = allSessions.filter(s => (s as any)._userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        interviewCount: u.interviewCount,
        completedInterviews: userSessions.filter(s => s.status === 'completed').length,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || null
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
