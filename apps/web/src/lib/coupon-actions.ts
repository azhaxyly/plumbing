"use server";

import { TRPCError } from "@trpc/server";
import { createServerTrpc } from "@/lib/trpc-server";

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

function extractError(err: unknown): string {
  if (err instanceof TRPCError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

export async function createCouponAction(input: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  usageLimit?: number | null;
  expiresAt?: string | null;
  isActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const coupon = await trpc.adminCoupons.create(input);
    return { data: { id: coupon.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateCouponAction(input: {
  id: string;
  code?: string;
  type?: "percent" | "fixed";
  value?: number;
  usageLimit?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCoupons.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteCouponAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminCoupons.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
