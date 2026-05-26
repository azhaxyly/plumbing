"use server";

/**
 * Server Actions for admin users page.
 * Handles role changes and block/unblock operations with audit logging.
 *
 * See task 27.
 */

import { prisma } from "@timsan/db";

import { auth } from "@/auth";
import { audit } from "@/lib/audit";

// ─── changeUserRole ───────────────────────────────────────────────────────────

/**
 * Changes the role of a user.
 *
 * Validates:
 * - Caller is authenticated and has admin role
 * - Cannot change own role
 * - Cannot demote the last admin
 *
 * Writes an AuditLog entry on success.
 */
export async function changeUserRole(
  userId: string,
  newRole: "customer" | "manager" | "admin",
): Promise<{ success: boolean; error?: string }> {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Не авторизован" };
  }

  const actor = session.user as { id?: string; role?: string };
  if (actor.role !== "admin") {
    return { success: false, error: "Только администратор может менять роли" };
  }

  const actorUserId = actor.id ?? null;

  // ── Cannot change own role ─────────────────────────────────────────────────
  if (actorUserId && actorUserId === userId) {
    return { success: false, error: "Нельзя изменить собственную роль" };
  }

  // ── Fetch target user ──────────────────────────────────────────────────────
  let targetUser: { role: string } | null;
  try {
    targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
  } catch {
    return { success: false, error: "Ошибка при получении пользователя" };
  }

  if (!targetUser) {
    return { success: false, error: "Пользователь не найден" };
  }

  const oldRole = targetUser.role;

  // ── Guard: cannot demote the last admin ────────────────────────────────────
  if (oldRole === "admin" && newRole !== "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });
    if (adminCount <= 1) {
      return {
        success: false,
        error: "Нельзя понизить роль последнего администратора",
      };
    }
  }

  // ── Update user role ───────────────────────────────────────────────────────
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
  } catch {
    return { success: false, error: "Ошибка при обновлении роли" };
  }

  // ── Audit log ──────────────────────────────────────────────────────────────
  await audit({
    actorUserId,
    action: "role_change",
    entity: "User",
    entityId: userId,
    before: { role: oldRole },
    after: { role: newRole },
  });

  return { success: true };
}

// ─── toggleUserBlock ──────────────────────────────────────────────────────────

/**
 * Blocks or unblocks a user.
 *
 * Validates:
 * - Caller is authenticated and has admin role
 * - Cannot block yourself
 *
 * Sets `blockedAt` to now() when blocking, null when unblocking.
 * Writes an AuditLog entry on success.
 */
export async function toggleUserBlock(
  userId: string,
  block: boolean,
): Promise<{ success: boolean; error?: string }> {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Не авторизован" };
  }

  const actor = session.user as { id?: string; role?: string };
  if (actor.role !== "admin") {
    return {
      success: false,
      error: "Только администратор может блокировать пользователей",
    };
  }

  const actorUserId = actor.id ?? null;

  // ── Cannot block yourself ──────────────────────────────────────────────────
  if (actorUserId && actorUserId === userId) {
    return { success: false, error: "Нельзя заблокировать самого себя" };
  }

  // ── Fetch target user ──────────────────────────────────────────────────────
  let targetUser: { blockedAt: Date | null } | null;
  try {
    targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { blockedAt: true },
    });
  } catch {
    return { success: false, error: "Ошибка при получении пользователя" };
  }

  if (!targetUser) {
    return { success: false, error: "Пользователь не найден" };
  }

  const wasBlocked = targetUser.blockedAt !== null;

  // ── Update blockedAt ───────────────────────────────────────────────────────
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { blockedAt: block ? new Date() : null },
    });
  } catch {
    return { success: false, error: "Ошибка при обновлении статуса блокировки" };
  }

  // ── Audit log ──────────────────────────────────────────────────────────────
  await audit({
    actorUserId,
    action: block ? "block" : "unblock",
    entity: "User",
    entityId: userId,
    before: { blockedAt: wasBlocked ? targetUser.blockedAt : null },
    after: { blockedAt: block ? new Date().toISOString() : null },
  });

  return { success: true };
}
