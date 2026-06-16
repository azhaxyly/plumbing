"use server";

/**
 * Server Actions for authentication flows.
 * All inputs are validated with Zod before processing.
 */
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";


import { signIn, signOut } from "@/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth-schemas";

// ─── Action result types ──────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ─── Token TTLs ───────────────────────────────────────────────────────────────
const RESET_TOKEN_TTL_SECONDS = 60 * 60;        // 1 hour
const VERIFY_TOKEN_TTL_SECONDS = 60 * 60 * 24;  // 24 hours

function resetTokenKey(token: string): string {
  return `auth:reset:${token}`;
}

function verifyTokenKey(token: string): string {
  return `auth:verify:${token}`;
}

async function getRedis() {
  const { default: Redis } = await import("ioredis");
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

  const normalizedEmail = parsed.data.email.toLowerCase();

  // Block login if email is not verified
  const { prisma } = await import("@timsan/db");
  const userCheck = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { emailVerifiedAt: true },
  });
  if (userCheck && !userCheck.emailVerifiedAt) {
    return {
      success: false,
      error: "Сначала подтвердите email. Проверьте папку входящих (и спам).",
    };
  }

  try {
    await signIn("credentials", {
      email: normalizedEmail,
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
  const newUser = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: "customer",
      pdnConsentAt: consentAt,
      pdnConsentVersion: "1.0",
    },
  });

  // Generate verification token and send confirmation email
  const { randomBytes } = await import("node:crypto");
  const verifyToken = randomBytes(32).toString("hex");

  try {
    const redis = await getRedis();
    try {
      await redis.set(verifyTokenKey(verifyToken), newUser.id, "EX", VERIFY_TOKEN_TTL_SECONDS);
    } finally {
      redis.disconnect();
    }
  } catch {
    // Redis unavailable — user will need to re-register or contact support
  }

  try {
    const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
    const verifyUrl = `${siteUrl}/verify-email?token=${verifyToken}`;
    await sendEmailVerificationEmail(normalizedEmail, verifyUrl);
  } catch (err) {
    console.error("[register] Failed to send verification email:", err);
  }

  redirect(`/register/check-email?email=${encodeURIComponent(normalizedEmail)}`);
}

// ─── Email verification ───────────────────────────────────────────────────────

async function sendEmailVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const nodemailer = await import("nodemailer");
  const { render } = await import("@react-email/render");
  const { createElement } = await import("react");
  const { EmailVerificationEmail } = await import(
    "@/lib/notifications/email/email-verification-template"
  );

  const transporter = nodemailer.default.createTransport({
    host: process.env["SMTP_HOST"] ?? "localhost",
    port: parseInt(process.env["SMTP_PORT"] ?? "1025", 10),
    secure: parseInt(process.env["SMTP_PORT"] ?? "1025", 10) === 465,
    auth: process.env["SMTP_USER"]
      ? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] ?? "" }
      : undefined,
  });

  const html = await render(createElement(EmailVerificationEmail, { verifyUrl }));
  const text = `Подтверждение email\n\nПерейдите по ссылке для активации аккаунта (действует 24 часа):\n${verifyUrl}\n\nЕсли вы не регистрировались — проигнорируйте это письмо.`;

  await transporter.sendMail({
    from: process.env["SMTP_FROM"] ?? "noreply@example.kz",
    to,
    subject: "Подтвердите ваш email — Timsan",
    html,
    text,
  });
}

// ─── Password reset email ─────────────────────────────────────────────────────

async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const nodemailer = await import("nodemailer");
  const { render } = await import("@react-email/render");
  const { createElement } = await import("react");
  const { PasswordResetEmail } = await import(
    "@/lib/notifications/email/password-reset-template"
  );

  const transporter = nodemailer.default.createTransport({
    host: process.env["SMTP_HOST"] ?? "localhost",
    port: parseInt(process.env["SMTP_PORT"] ?? "1025", 10),
    secure: parseInt(process.env["SMTP_PORT"] ?? "1025", 10) === 465,
    auth: process.env["SMTP_USER"]
      ? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] ?? "" }
      : undefined,
  });

  const html = await render(createElement(PasswordResetEmail, { resetUrl }));
  const text = `Сброс пароля\n\nПерейдите по ссылке для сброса пароля (действует 60 минут):\n${resetUrl}\n\nЕсли вы не запрашивали сброс — проигнорируйте это письмо.`;

  await transporter.sendMail({
    from: process.env["SMTP_FROM"] ?? "noreply@example.kz",
    to,
    subject: "Сброс пароля",
    html,
    text,
  });
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
      try {
        await redis.set(resetTokenKey(token), user.id, "EX", RESET_TOKEN_TTL_SECONDS);
      } finally {
        redis.disconnect();
      }
    } catch {
      // Redis unavailable — silently fail (don't reveal to user)
    }

    // Send password reset email
    try {
      const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
      const resetUrl = `${siteUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(normalizedEmail, resetUrl);
    } catch (err) {
      console.error("[forgotPassword] Failed to send reset email:", err);
      // Non-critical — token is stored in Redis, user can request again
    }
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
    try {
      userId = await redis.get(resetTokenKey(token));
      if (userId) {
        await redis.del(resetTokenKey(token));
      }
    } finally {
      redis.disconnect();
    }
  } catch (err) {
    console.error("[resetPassword] Redis error:", err);
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

  return { success: true };
}

// ─── logoutAction ─────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/");
}
