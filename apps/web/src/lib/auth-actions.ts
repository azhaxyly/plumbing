"use server";

/**
 * Server Actions for authentication flows.
 * All inputs are validated with Zod before processing.
 */
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth-schemas";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ─── Action result types ──────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ─── Reset token TTL ──────────────────────────────────────────────────────────
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function resetTokenKey(token: string): string {
  return `auth:reset:${token}`;
}

async function getRedis() {
  const { Redis } = await import("ioredis");
  return new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}

// ─── loginAction ─────────────────────────────────────────────────────────────

/**
 * Validates credentials and signs the user in.
 * On success, redirects to /account (or callbackUrl).
 */
export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Rate limit: 10 login attempts per 15 minutes per IP
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    keyPrefix: "rl:login",
    points: 10,
    duration: 900,
  });
  if (!rl.allowed) {
    return {
      success: false,
      error: `Слишком много попыток. Попробуйте через ${rl.retryAfter ?? 60} сек.`,
    };
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        success: false,
        error: "Неверный email или пароль. Проверьте данные и попробуйте снова.",
      };
    }
    throw err;
  }

  redirect("/account");
}

// ─── registerAction ───────────────────────────────────────────────────────────

/**
 * Creates a new user account with argon2id-hashed password, then signs in.
 */
export async function registerAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Rate limit: 5 registrations per hour per IP
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    keyPrefix: "rl:register",
    points: 5,
    duration: 3600,
  });
  if (!rl.allowed) {
    return {
      success: false,
      error: `Слишком много попыток. Попробуйте через ${rl.retryAfter ?? 60} сек.`,
    };
  }

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    pdnConsent: formData.get("pdnConsent") === "on" ? true : formData.get("pdnConsent"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists
  const { prisma } = await import("@timsan/db");
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      fieldErrors: {
        email: ["Пользователь с таким email уже зарегистрирован"],
      },
    };
  }

  // Hash password with argon2id
  const argon2 = await import("argon2");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Create user — store ПДн consent timestamp and policy version (task 55.3)
  const consentAt = new Date();
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "customer",
      pdnConsentAt: consentAt,
      pdnConsentVersion: "1.0",
    },
  });

  // Sign in the newly created user
  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        success: false,
        error: "Аккаунт создан, но не удалось войти. Попробуйте войти вручную.",
      };
    }
    throw err;
  }

  redirect("/account");
}

// ─── forgotPasswordAction ─────────────────────────────────────────────────────

/**
 * Validates email and creates a password reset token in Redis.
 * Actual email sending is implemented in Phase 6.5.
 */
export async function forgotPasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Rate limit: 3 reset requests per hour per IP
  const ip = await getClientIp();
  const rl = await checkRateLimit(ip, {
    keyPrefix: "rl:forgot",
    points: 3,
    duration: 3600,
  });
  if (!rl.allowed) {
    return {
      success: false,
      error: `Слишком много запросов. Попробуйте через ${rl.retryAfter ?? 60} сек.`,
    };
  }

  const raw = { email: formData.get("email") };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  // Check if user exists (don't reveal whether email is registered)
  const { prisma } = await import("@timsan/db");
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (user) {
    // Generate a secure reset token
    const { randomBytes } = await import("node:crypto");
    const token = randomBytes(32).toString("hex");

    // Store token → userId in Redis with TTL
    try {
      const redis = await getRedis();
      await redis.set(
        resetTokenKey(token),
        user.id,
        "EX",
        RESET_TOKEN_TTL_SECONDS,
      );
      await redis.quit();
    } catch {
      // Redis unavailable — silently fail (don't reveal to user)
    }

    // TODO (Phase 6.5): enqueue email with reset link
    // await enqueueResetEmail({ email: normalizedEmail, token });
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
  };
}

// ─── resetPasswordAction ──────────────────────────────────────────────────────

/**
 * Validates the reset token and updates the user's password.
 */
export async function resetPasswordAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    token: formData.get("token"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { password, token } = parsed.data;

  // Look up token in Redis
  let userId: string | null = null;
  try {
    const redis = await getRedis();
    userId = await redis.get(resetTokenKey(token));
    if (userId) {
      // Invalidate token immediately (one-time use)
      await redis.del(resetTokenKey(token));
    }
    await redis.quit();
  } catch {
    return {
      success: false,
      error: "Не удалось проверить токен. Попробуйте позже.",
    };
  }

  if (!userId) {
    return {
      success: false,
      error: "Ссылка для сброса пароля недействительна или истекла. Запросите новую.",
    };
  }

  // Hash new password
  const argon2 = await import("argon2");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Update password in DB
  const { prisma } = await import("@timsan/db");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  redirect("/login?reset=success");
}

// ─── logoutAction ─────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/");
}
