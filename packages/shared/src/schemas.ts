/**
 * Common Zod schemas shared across the monorepo.
 * Domain-specific schemas live in their respective packages.
 */

import { z } from "zod";

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// Slug
export const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

// ID (CUID2 or UUID)
export const idSchema = z.string().min(1).max(128);
