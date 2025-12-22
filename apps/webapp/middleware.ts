import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

function hasAuthProvidersConfigured(): boolean {
  const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasGithub = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
  return hasGoogle || hasGithub;
}

export default withAuth(
  function middleware(req) {
    // Local-dev friendly: when no OAuth providers are configured, don't block access to /studio pages.
    if (!hasAuthProvidersConfigured()) {
      return NextResponse.next();
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => {
        // Allow access if no OAuth providers are configured (local dev)
        if (!hasAuthProvidersConfigured()) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/studio/:path*", "/history/:path*", "/settings/:path*", "/account/:path*"],
};


