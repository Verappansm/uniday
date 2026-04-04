import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export type AppRole = 'admin' | 'volunteer' | 'mc';

export interface AuthSession {
  role: AppRole;
  username: string;
}

export async function getAuthSession(request: NextRequest): Promise<AuthSession | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'super-secret-key-change-me'
    );
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role;
    const username = payload.username;

    if (
      (role === 'admin' || role === 'volunteer' || role === 'mc') &&
      typeof username === 'string'
    ) {
      return { role, username };
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: AppRole[]
): Promise<AuthSession | null> {
  const session = await getAuthSession(request);
  if (!session) return null;
  return allowedRoles.includes(session.role) ? session : null;
}
