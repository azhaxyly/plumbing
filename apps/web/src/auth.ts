/**
 * Main Auth.js v5 configuration (Node.js runtime only).
 * Handles credentials provider with argon2id password verification,
 * Redis-based lockout, JWT sessions, and RBAC role in token.
 */
import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "./auth.config";

// ─── Lockout constants ────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TTL_SECONDS = 15 * 60; // 15 minutes

// ─── Secret resolution ────────────────────────────────────────────────────────
/**
 * Resolves NEXTAUTH_SECRET, failing fast if it's missing or too weak.
 * An empty/short secret means JWT session tokens can be forged, so we refuse to
 * boot with one. `next build` runs without real secrets (SKIP_ENV_VALIDATION),
 * so the check is skipped there — it only guards the actual runtime.
 */
function resolveAuthSecret(): string {
  const secret = process.env["NEXTAUTH_SECRET"] ?? "";
  const isBuild = process.env["SKIP_ENV_VALIDATION"] === "true";
  if (!isBuild && secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET is missing or too short (need ≥32 chars). " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return secret;
}

function lockoutKey(email: string): string {
  return `auth:lockout:${email.toLowerCase()}`;
}

// ─── Lazy imports (Node.js only) ──────────────────────────────────────────────
async function getArgon2() {
  const argon2 = await import("argon2");
  return argon2;
}

async function getRedis() {
  const { default: Redis } = await import("ioredis");
  const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  return redis;
}

async function getPrisma() {
  const { prisma } = await import("@timsan/db");
  return prisma;
}

// ─── Credentials schema ───────────────────────────────────────────────────────
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Auth.js config ───────────────────────────────────────────────────────────

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // ── Redis lockout check ──────────────────────────────────────────────
        let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
        try {
          redis = await getRedis();
          const failCount = await redis.get(lockoutKey(normalizedEmail));
          if (failCount !== null && parseInt(failCount, 10) >= MAX_FAILED_ATTEMPTS) {
            // Account is locked out
            return null;
          }
        } catch {
          // Redis unavailable — allow login attempt (fail open for availability)
        }

        // ── User lookup ──────────────────────────────────────────────────────
        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            emailVerifiedAt: true,
          },
        });

        if (!user) {
          // Increment lockout counter even for non-existent users (timing attack mitigation)
          await incrementLockout(redis, normalizedEmail);
          return null;
        }

        // ── Password verification ────────────────────────────────────────────
        const argon2 = await getArgon2();
        let passwordValid = false;
        try {
          passwordValid = await argon2.verify(user.passwordHash, password);
        } catch {
          return null;
        }

        if (!passwordValid) {
          await incrementLockout(redis, normalizedEmail);
          return null;
        }

        // ── Success: reset lockout counter ───────────────────────────────────
        try {
          if (redis) {
            await redis.del(lockoutKey(normalizedEmail));
          }
        } catch {
          // ignore
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env["NEXTAUTH_URL"]?.startsWith("https://") ?? false,
        sameSite: "lax",
        path: "/",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign-in: embed role and id into JWT
        token["role"] = (user as { role?: string }).role ?? "customer";
        token["id"] = user.id;
      }
      // Rotate JWT on every sign-in trigger
      if (trigger === "signIn" && user?.id) {
        token["iat"] = Math.floor(Date.now() / 1000);

        // Migrate guest cart to DB cart on login
        try {
          const { mergeGuestCartOnLogin } = await import("@/lib/cart-actions");
          await mergeGuestCartOnLogin(user.id);
        } catch (err) {
          // Cart migration failure must not block login
          console.error("[auth] cart migration failed:", err);
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = (token["role"] as string) ?? "customer";
        (session.user as { id?: string }).id = token["id"] as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/account") || nextUrl.pathname.startsWith("/admin");

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }
      return true;
    },
  },
  secret: resolveAuthSecret(),
});

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers;
export const auth: NextAuthResult["auth"] = nextAuth.auth;
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function incrementLockout(
  redis: Awaited<ReturnType<typeof getRedis>> | null,
  email: string,
): Promise<void> {
  if (!redis) return;
  try {
    const key = lockoutKey(email);
    const count = await redis.incr(key);
    if (count === 1) {
      // Set TTL only on first increment
      await redis.expire(key, LOCKOUT_TTL_SECONDS);
    }
  } catch {
    // ignore Redis errors
  }
}
