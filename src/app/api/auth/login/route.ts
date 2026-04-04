import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me');

    let role: string | null = null;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      role = 'admin';
    } else if (username === process.env.VOLUNTEER_USERNAME && password === process.env.VOLUNTEER_PASSWORD) {
      role = 'volunteer';
    } else if (username === process.env.MC_USERNAME && password === process.env.MC_PASSWORD) {
      role = 'mc';
    }

    if (!role) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await new SignJWT({ role, username })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    const response = NextResponse.json({ success: true, role });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
