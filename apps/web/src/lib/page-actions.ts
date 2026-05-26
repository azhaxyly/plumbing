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

export async function createPageAction(input: {
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const page = await trpc.adminPages.create(input);
    return { data: { id: page.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updatePageAction(input: {
  id: string;
  slug?: string;
  title?: string;
  content?: string;
  isPublished?: boolean;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminPages.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deletePageAction(input: { id: string }): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminPages.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
