import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPaths: Record<string, string[]> = {
  '/admin': ['admin'],
  '/volunteer': ['volunteer'],
  '/mc': ['mc'],
  '/api/admin': ['admin'],
  '/api/upload': ['admin'],
  '/api/email': ['admin'],
  '/api/users': ['admin', 'volunteer', 'mc'],
  '/api/dashboard': ['admin'],
  '/api/seating': ['admin', 'volunteer', 'mc'],
  '/api/checkin': ['admin', 'volunteer'],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname.startsWith('/rsvp') ||
    pathname.startsWith('/api/rsvp') ||
    pathname.startsWith('/api/track') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check auth for protected routes
  const matchedPath = Object.keys(protectedPaths).find((p) => pathname.startsWith(p));
  if (!matchedPath) return NextResponse.next();

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-me');
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const allowedRoles = protectedPaths[matchedPath];

    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
