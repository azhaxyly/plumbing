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

export async function createReviewAction(input: {
  authorName: string;
  rating: number;
  text: string;
  position: number;
  isActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const review = await trpc.adminReviews.create(input);
    return { data: { id: review.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateReviewAction(input: {
  id: string;
  authorName?: string;
  rating?: number;
  text?: string;
  position?: number;
  isActive?: boolean;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminReviews.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteReviewAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminReviews.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
