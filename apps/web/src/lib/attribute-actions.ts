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

export async function createAttributeAction(input: {
  name: string;
  slug: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const attr = await trpc.adminAttributes.create(input);
    return { data: { id: attr.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateAttributeAction(input: {
  id: string;
  name?: string;
  slug?: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminAttributes.update(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteAttributeAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminAttributes.delete(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function createAttributeValueAction(input: {
  attributeId: string;
  value: string;
  slug: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trpc = await createServerTrpc();
    const val = await trpc.adminAttributes.createValue(input);
    return { data: { id: val.id } };
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function updateAttributeValueAction(input: {
  id: string;
  value?: string;
  slug?: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminAttributes.updateValue(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}

export async function deleteAttributeValueAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const trpc = await createServerTrpc();
    await trpc.adminAttributes.deleteValue(input);
    return {};
  } catch (err) {
    return { error: extractError(err) };
  }
}
