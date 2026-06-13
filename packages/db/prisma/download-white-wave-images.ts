/**
 * Downloads White Wave product images from bulak-opt.kz → uploads to MinIO → updates DB.
 *
 * Run: pnpm --filter @timsan/db exec tsx prisma/download-white-wave-images.ts
 */

import fs from "fs";
import { createHmac, createHash } from "crypto";
import { PrismaClient } from "../generated/client";

try {
  const lines = fs.readFileSync(".env", "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch { /* no .env */ }

const prisma = new PrismaClient();

const S3_ENDPOINT = process.env["S3_ENDPOINT"] ?? "http://localhost:9000";
const S3_BUCKET = process.env["S3_BUCKET"] ?? "media";
const S3_REGION = process.env["S3_REGION"] ?? "us-east-1";
const S3_ACCESS_KEY = process.env["S3_ACCESS_KEY_ID"] ?? process.env["S3_ACCESS_KEY"] ?? "minioadmin";
const S3_SECRET_KEY = process.env["S3_SECRET_ACCESS_KEY"] ?? process.env["S3_SECRET_KEY"] ?? "minioadmin";
const S3_PUBLIC_URL = process.env["S3_PUBLIC_URL"] ?? `${S3_ENDPOINT}/${S3_BUCKET}`;

// ─── S3 presigned PUT ──────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function presignedPut(key: string, contentType: string): string {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const host = new URL(S3_ENDPOINT).host;
  const uri = `/${S3_BUCKET}/${key}`;
  const credential = `${S3_ACCESS_KEY}/${dateStamp}/${S3_REGION}/s3/aws4_request`;

  const qp: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "300",
    "X-Amz-SignedHeaders": "content-type;host",
  };
  const qs = Object.keys(qp).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k]!)}`).join("&");

  const canonicalReq = ["PUT", uri, qs, `content-type:${contentType}\nhost:${host}\n`, "content-type;host", "UNSIGNED-PAYLOAD"].join("\n");
  const sts = ["AWS4-HMAC-SHA256", amzDate, `${dateStamp}/${S3_REGION}/s3/aws4_request`, sha256Hex(canonicalReq)].join("\n");

  const sigKey = hmac(hmac(hmac(hmac(`AWS4${S3_SECRET_KEY}`, dateStamp), S3_REGION), "s3"), "aws4_request");
  const sig = createHmac("sha256", sigKey).update(sts, "utf8").digest("hex");

  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}?${qs}&X-Amz-Signature=${sig}`;
}

// ─── Upload one image ─────────────────────────────────────────────────────────

function extFromUrl(url: string): string {
  const m = url.match(/\.(png|jpe?g|webp|gif)(\?|$)/i);
  return m ? `.${m[1]!.toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
}

function mimeFromExt(ext: string): string {
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
}

async function uploadImage(sourceUrl: string, folder = "products"): Promise<string> {
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${sourceUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const ext = extFromUrl(sourceUrl);
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const contentType = mimeFromExt(ext);

  const putUrl = presignedPut(key, contentType);
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buf,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`MinIO PUT failed ${putRes.status}: ${txt}`);
  }

  return `${S3_PUBLIC_URL}/${key}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📥 Downloading White Wave images → MinIO...\n");

  const brand = await prisma.brand.findUnique({ where: { slug: "white-wave" } });
  if (!brand) { console.error("Brand white-wave not found"); process.exit(1); }

  const images = await prisma.productImage.findMany({
    where: {
      url: { startsWith: "https://www.bulak-opt.kz" },
      product: { brandId: brand.id },
    },
    select: { id: true, url: true },
  });

  if (images.length === 0) {
    console.log("No external images to migrate.");
    return;
  }

  console.log(`Found ${images.length} images to migrate.\n`);

  let ok = 0;
  for (const img of images) {
    try {
      process.stdout.write(`  Uploading ${img.url.split("/").pop()} ... `);
      const newUrl = await uploadImage(img.url);
      await prisma.productImage.update({ where: { id: img.id }, data: { url: newUrl } });
      console.log(`✓ ${newUrl}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${String(e)}`);
    }
  }

  console.log(`\n✅ Migrated ${ok}/${images.length} images.`);
}

main()
  .catch(e => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
