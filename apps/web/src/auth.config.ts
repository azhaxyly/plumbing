/**
 * Edge-compatible Auth.js config (no Node.js APIs like argon2).
 * Used by middleware.ts which runs on the Edge runtime.
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Minimal credentials provider for edge — actual password verification
// happens in auth.ts (Node.js runtime only).
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is intentionally empty here — the full implementation
      // lives in auth.ts (Node.js runtime). This config is only used
      // by the middleware for session/route checks.
      authorize: () => null,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/account") ||
        nextUrl.pathname.startsWith("/admin");

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token["role"] = (user as { role?: string }).role ?? "customer";
        token["id"] = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role =
          (token["role"] as string) ?? "customer";
        (session.user as { id?: string }).id = token["id"] as string;
      }
      return session;
    },
  },
};
