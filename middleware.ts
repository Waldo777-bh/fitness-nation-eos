import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, AUTH_TOKEN } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ingest') ||
    pathname.startsWith('/api/sync');

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token !== AUTH_TOKEN) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
