/**
 * @whitehouse/shared
 * Shared utilities, Zod schemas, environment config, and common types.
 * Used across all apps and packages.
 */

// Environment config (typed via @t3-oss/env-nextjs) — added in Task 3.1
export { env } from "./env";

// Money utilities — added in Task 3.2
export * from "./money";

// Zod schemas — added as needed
export * from "./schemas";
