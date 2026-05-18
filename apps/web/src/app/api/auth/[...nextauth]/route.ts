/**
 * Auth.js v5 route handler.
 * Handles all /api/auth/* requests (signin, signout, session, csrf, etc.)
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
