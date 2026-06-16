/**
 * BullMQ Worker entry point.
 * Handles background jobs: catalog import, search indexing,
 * notifications, Kaspi reconciliation, etc.
 */

// Load .env before any other imports (for local dev without a process manager)
import "dotenv/config";

import { prisma } from "@timsan/db";
import { configureProductIndex, indexProduct, deleteProductFromIndex } from "@timsan/search";
import type { ProductSearchDocument } from "@timsan/search";
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";

import { handleNotificationJob } from "./notification-handler";
import type { NotificationJobData } from "./notification-handler";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// ─── Search indexing queue ────────────────────────────────────────────────────

export const searchIndexingQueue = new Queue("search-indexing", {
  connection,
});

// ─── Default worker ───────────────────────────────────────────────────────────

const defaultWorker = new Worker(
  "default",
  async (job) => {
    console.warn(`[worker] Processing job: ${job.name} (id=${job.id})`);
  },
  { connection },
);

defaultWorker.on("completed", (job) => {
  console.warn(`[worker] Job completed: ${job.name} (id=${job.id})`);
});

defaultWorker.on("failed", (job, err) => {
  console.error(`[worker] Job failed: ${job?.name} (id=${job?.id})`, err);
});

// ─── Search indexing worker ───────────────────────────────────────────────────

interface IndexProductJobData {
  productId: string;
  action: "upsert" | "delete";
}

const searchIndexingWorker = new Worker<IndexProductJobData>(
  "search-indexing",
  async (job) => {
    const { productId, action } = job.data;

    if (action === "delete") {
      console.warn(`[worker] Deleting product from index: ${productId}`);
      await deleteProductFromIndex(productId);
      return;
    }

    // action === "upsert"
    console.warn(`[worker] Indexing product: ${productId}`);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true },
            },
          },
        },
        variants: {
          select: { quantity: true, reserved: true },
        },
        productAttributes: {
          include: {
            attributeValue: { select: { value: true } },
          },
        },
      },
    });

    if (!product) {
      console.warn(`[worker] Product not found: ${productId}, skipping index`);
      return;
    }

    const primaryImage = product.images[0] ?? null;
    const totalAvailable = product.variants.reduce((sum, v) => sum + (v.quantity - v.reserved), 0);

    const doc: ProductSearchDocument = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      priceCents: product.priceCents,
      compareAtPriceCents: product.compareAtPriceCents,
      status: product.status,
      brandName: product.brand?.name ?? null,
      brandSlug: product.brand?.slug ?? null,
      categoryIds: product.categories.map((pc) => pc.category.id),
      categoryNames: product.categories.map((pc) => pc.category.name),
      attributeValues: product.productAttributes.map((pa) => pa.attributeValue.value),
      primaryImageUrl: primaryImage?.url ?? null,
      inStock: totalAvailable > 0,
      createdAt: product.createdAt.toISOString(),
    };

    await indexProduct(doc);
    console.warn(`[worker] Product indexed: ${productId}`);
  },
  { connection },
);

searchIndexingWorker.on("completed", (job) => {
  console.warn(`[worker] Search indexing job completed: ${job.name} (id=${job.id})`);
});

searchIndexingWorker.on("failed", (job, err) => {
  console.error(`[worker] Search indexing job failed: ${job?.name} (id=${job?.id})`, err);
});

// ─── Notification worker ──────────────────────────────────────────────────────
// Consumes jobs from the "notifications" queue (produced by apps/web after
// order events). Retry policy: 5 attempts, exponential backoff (configured
// on the producer side via defaultJobOptions in notification-queue.ts).
// Failed jobs are kept in Redis (dead-letter) for manual inspection.

const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job) => {
    await handleNotificationJob(job);
  },
  {
    connection,
    concurrency: 5,
  },
);

notificationWorker.on("completed", (job) => {
  console.warn(`[worker] Notification job completed: ${job.name} (id=${job.id})`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[worker] Notification job failed: ${job?.name} (id=${job?.id})`, err);
});

// ─── Startup: configure Meilisearch index ─────────────────────────────────────

async function startup() {
  try {
    console.warn("[worker] Configuring Meilisearch product index...");
    const brands = await prisma.brand.findMany({ select: { name: true } });
    await configureProductIndex(brands.map((b) => b.name));
    console.warn(
      `[worker] Meilisearch product index configured (${brands.length} brands → synonyms).`,
    );
  } catch (err) {
    console.error("[worker] Failed to configure Meilisearch index:", err);
    // Non-fatal: worker continues even if Meilisearch is temporarily unavailable
  }
}

void startup();

console.warn("[worker] BullMQ worker started");
