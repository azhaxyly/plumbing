/**
 * POST /api/admin/upload
 *
 * Generates a presigned PUT URL for uploading files to S3-compatible storage.
 * Uses AWS Signature Version 4 (HMAC-SHA256) without the AWS SDK.
 *
 * Request body: { filename: string; contentType: string; folder?: "brands" | "products" }
 * Response:     { uploadUrl: string; publicUrl: string }
 *
 * Protected: only admin and manager roles.
 * See task 25.2.
 */

import { createHmac, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

// ─── Input schema ─────────────────────────────────────────────────────────────

const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(127),
  folder: z.enum(["brands", "products"]).default("brands"),
});

// ─── S3 config ────────────────────────────────────────────────────────────────

function getS3Config() {
  const endpoint = process.env["S3_ENDPOINT"] ?? "http://localhost:9000";
  const region = process.env["S3_REGION"] ?? "us-east-1";
  const bucket = process.env["S3_BUCKET"] ?? "media";
  const accessKeyId =
    process.env["S3_ACCESS_KEY_ID"] ??
    process.env["S3_ACCESS_KEY"] ??
    "minioadmin";
  const secretAccessKey =
    process.env["S3_SECRET_ACCESS_KEY"] ??
    process.env["S3_SECRET_KEY"] ??
    "minioadmin";
  const publicUrl =
    process.env["S3_PUBLIC_URL"] ?? `${endpoint}/${bucket}`;

  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrl };
}

// ─── UUID v4 (crypto-based, no external dep) ──────────────────────────────────

function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version 4 bits
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  // Set variant bits
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── AWS Signature V4 helpers ─────────────────────────────────────────────────

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

/**
 * Generates a presigned PUT URL using AWS Signature Version 4.
 * Works with AWS S3 and S3-compatible stores (MinIO, Yandex S3, etc.).
 */
function generatePresignedPutUrl(params: {
  endpoint: string;
  region: string;
  bucket: string;
  key: string;
  contentType: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number; // seconds
}): string {
  const {
    endpoint,
    region,
    bucket,
    key,
    contentType,
    accessKeyId,
    secretAccessKey,
    expiresIn,
  } = params;

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);

  // Parse endpoint to get host
  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;

  // Determine if path-style or virtual-hosted-style
  // MinIO uses path-style: endpoint/bucket/key
  // AWS uses virtual-hosted: bucket.s3.region.amazonaws.com/key
  const isPathStyle =
    !endpoint.includes("amazonaws.com") ||
    endpointUrl.hostname === "localhost" ||
    endpointUrl.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

  let objectUrl: string;
  let canonicalHost: string;
  let canonicalUri: string;

  if (isPathStyle) {
    objectUrl = `${endpoint}/${bucket}/${key}`;
    canonicalHost = host;
    canonicalUri = `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  } else {
    objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    canonicalHost = `${bucket}.s3.${region}.amazonaws.com`;
    canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  }

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  // Canonical query string (sorted)
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "content-type;host",
  };

  const sortedQueryKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedQueryKeys
    .map(
      (k) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k] ?? "")}`,
    )
    .join("&");

  // Canonical headers (must match SignedHeaders)
  const canonicalHeaders = `content-type:${contentType}\nhost:${canonicalHost}\n`;

  // Canonical request
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    "content-type;host",
    payloadHash,
  ].join("\n");

  // String to sign
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  // Signature
  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, "s3");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  // Final URL
  const signedUrl = `${objectUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  return signedUrl;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  if (!role || (role !== "admin" && role !== "manager")) {
    return NextResponse.json(
      { error: "Требуется роль admin или manager" },
      { status: 403 },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный JSON в теле запроса" },
      { status: 400 },
    );
  }

  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные параметры", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { filename, contentType, folder } = parsed.data;

  // Sanitize filename: keep only safe characters
  const safeName = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);

  const uuid = uuidv4();
  const key = `${folder}/${uuid}-${safeName}`;

  const config = getS3Config();

  const uploadUrl = generatePresignedPutUrl({
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    key,
    contentType,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    expiresIn: 3600, // 1 hour
  });

  // Public URL for accessing the uploaded file
  const publicUrl = `${config.publicUrl}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl });
}
