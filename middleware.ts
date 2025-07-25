import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;
  const origin = req.headers.get('origin') || req.nextUrl.origin;

  // If user is not authenticated
  if (!userId) {
    // Allow access to public routes
    if (isPublicRoute(req) || pathname.startsWith('/audio') || pathname.startsWith('/manifest.json')) {
      return NextResponse.next();
    }
    
    // Redirect to sign-in for all other routes
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Domain validation for authenticated users
  const allowedOrigins = [
    'https://www.treasurehunt.ospcvitc.club',
    'http://localhost:3000'
  ];

  if (!allowedOrigins.includes(origin)) {
    return new NextResponse('Forbidden - Invalid origin', { status: 403 });
  }

  // If user is authenticated and from allowed origin, allow access to all routes
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
