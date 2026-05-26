/**
 * BullMQ notification queue for the web process.
 *
 * Provides a singleton Queue instance and helper functions to enqueue
 * notification jobs after order events. Workers in apps/worker consume
 * these jobs and dispatch email/Telegram/SMS notifications.
 *
 * Topics:
 *   - order.created   — new order placed (after COMMIT in submitOrder)
 *   - order.confirmed — order status changed to "confirmed"
 *   - order.cancelled — order status changed to "cancelled"
 *
 * Retry policy: exponential backoff, 5 attempts, initial delay 2 s.
 * Dead-letter: removeOnFail: false — failed jobs are kept for inspection.
 *
 * See design.md → «Phase 5 — Уведомления», tasks 36.1–36.3.
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

// Singleton Redis connection for the notification queue.
// maxRetriesPerRequest: null is required by BullMQ.
let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return _connection;
}

// ─── Job data types ───────────────────────────────────────────────────────────

export interface OrderCreatedJobData {
  orderId: string;
}

export interface OrderStatusChangedJobData {
  orderId: string;
  newStatus: "confirmed" | "cancelled";
  actorType: "admin" | "telegram_bot";
}

export type NotificationJobData =
  | { type: "order.created"; data: OrderCreatedJobData }
  | { type: "order.confirmed"; data: OrderStatusChangedJobData }
  | { type: "order.cancelled"; data: OrderStatusChangedJobData };

// ─── Queue ────────────────────────────────────────────────────────────────────

/**
 * Shared BullMQ queue for all notification jobs.
 *
 * Default job options:
 *   - attempts: 5 (exponential backoff: 2 s → 4 s → 8 s → 16 s → 32 s)
 *   - removeOnComplete: keep last 100 completed jobs
 *   - removeOnFail: false — failed jobs stay in the queue (dead-letter)
 *
 * The third generic parameter `string` allows any string as the job name,
 * avoiding TypeScript inference issues with union discriminants.
 */
export const notificationQueue = new Queue<NotificationJobData, void, string>("notifications", {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000, // 2 s → 4 s → 8 s → 16 s → 32 s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: false, // keep failed jobs for dead-letter inspection
  },
});

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

/**
 * Enqueues an `order.created` notification job.
 * Should be called from submitOrder immediately after the DB transaction commits.
 *
 * Uses a deterministic jobId for idempotency — re-enqueueing the same orderId
 * is a no-op if the job already exists.
 */
export async function enqueueOrderCreated(orderId: string): Promise<void> {
  await notificationQueue.add(
    "order.created",
    { type: "order.created", data: { orderId } },
    { jobId: `order.created:${orderId}` },
  );
}

/**
 * Enqueues an `order.confirmed` or `order.cancelled` notification job.
 * Called when an admin or Telegram bot changes the order status.
 */
export async function enqueueOrderStatusChanged(
  orderId: string,
  newStatus: "confirmed" | "cancelled",
  actorType: "admin" | "telegram_bot" = "admin",
): Promise<void> {
  const type: string =
    newStatus === "confirmed" ? "order.confirmed" : "order.cancelled";
  await notificationQueue.add(type, {
    type: type as "order.confirmed" | "order.cancelled",
    data: { orderId, newStatus, actorType },
  });
}
