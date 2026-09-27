import { NextRequest, NextResponse } from 'next/server';
import { authStore } from '@/lib/auth/authStore';
import { verifyPassword, createSession } from '@/lib/auth/authUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const user = authStore.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const passwordValid = verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = createSession(user.id, user.role);
    authStore.updateUser(user.id, { lastLoginAt: Date.now() });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 });
  }
}
