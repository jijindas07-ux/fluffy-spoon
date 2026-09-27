import { NextRequest, NextResponse } from 'next/server';
import { validateToken, extractTokenFromRequest } from '@/lib/auth/authUtils';
import { authStore } from '@/lib/auth/authStore';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      authStore.deleteSession(token);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: true }); // Always succeed logout
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const auth = validateToken(token);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
        interviewCount: auth.user.interviewCount,
        createdAt: auth.user.createdAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Auth check failed' }, { status: 500 });
  }
}
