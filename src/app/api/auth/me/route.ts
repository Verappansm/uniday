import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me');
    const { payload } = await jwtVerify(token, secret);
    return NextResponse.json({
      authenticated: true,
      role: payload.role,
      username: payload.username,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
