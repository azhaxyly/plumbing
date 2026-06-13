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

export async function createPromoSlideAction(input: {
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
    const slide = await trpc.adminPromoSlides.create({
      ...input,
      linkUrl: input.linkUrl?.trim() || undefined,
    });
    return { data: { id: slide.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updatePromoSlideAction(input: {
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
    await trpc.adminPromoSlides.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deletePromoSlideAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminPromoSlides.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
