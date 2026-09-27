import { NextRequest, NextResponse } from 'next/server';
import { authStore } from '@/lib/auth/authStore';
import { hashPassword, createSession } from '@/lib/auth/authUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (authStore.isEmailTaken(email)) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = authStore.createUser({ email, name, passwordHash, role: 'user' });
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
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'Registration failed.' }, { status: 500 });
  }
}
