import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

function hasAuthProvidersConfigured(): boolean {
  const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasGithub = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
  return hasGoogle || hasGithub;
}

export default function middleware(req: NextRequest) {
  // Local-dev friendly: when no OAuth providers are configured, don't block access to /studio pages.
  // This makes it possible to iterate on UI without setting up NextAuth providers first.
  if (!hasAuthProvidersConfigured()) {
    return NextResponse.next();
  }
  // Delegate to next-auth middleware for real auth gating.
  return authMiddleware(req as any);
}

export const config = {
  matcher: ["/studio/:path*", "/history/:path*", "/settings/:path*", "/account/:path*"],
};


