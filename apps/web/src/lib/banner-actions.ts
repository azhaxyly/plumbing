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

export async function createBannerAction(input: {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  position: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const banner = await trpc.adminBanners.create(input);
    return { data: { id: banner.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateBannerAction(input: {
  id: string;
  title?: string;
  imageUrl?: string;
  linkUrl?: string | null;
  position?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteBannerAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminBanners.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
