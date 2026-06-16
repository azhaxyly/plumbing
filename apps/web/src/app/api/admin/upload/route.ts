/**
 * POST /api/admin/upload
 *
 * Accepts a multipart/form-data upload and proxies it to S3-compatible storage
 * server-side (avoids browser CORS restrictions with MinIO).
 * Uses AWS Signature Version 4 (HMAC-SHA256) without the AWS SDK.
 *
 * Request body: FormData { file: File; folder?: "brands" | "products" | "banners" }
 * Response:     { publicUrl: string }
 *
 * Protected: only admin and manager roles.
 */

import { createHmac, createHash } from "crypto";

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

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
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
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
  return hmacSha256(kService, "aws4_request");
}

function generatePresignedPutUrl(params: {
  endpoint: string;
  region: string;
  bucket: string;
  key: string;
  contentType: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresIn: number;
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

  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;

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

  const canonicalHeaders = `content-type:${contentType}\nhost:${canonicalHost}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, "s3");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `${objectUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

const ALLOWED_FOLDERS = ["brands", "products", "banners", "categories", "promo-slides"] as const;
type Folder = (typeof ALLOWED_FOLDERS)[number];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  if (!role || (role !== "admin" && role !== "manager")) {
    return NextResponse.json(
      { error: "Требуется роль admin или manager" },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Поле file обязательно" },
      { status: 400 },
    );
  }

  const folderRaw = (formData.get("folder") as string | null) ?? "brands";
  if (!ALLOWED_FOLDERS.includes(folderRaw as Folder)) {
    return NextResponse.json(
      { error: "Некорректное значение folder" },
      { status: 400 },
    );
  }
  const folder = folderRaw as Folder;

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);

  const key = `${folder}/${uuidv4()}-${safeName}`;
  const config = getS3Config();

  const uploadUrl = generatePresignedPutUrl({
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    key,
    contentType: file.type,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    expiresIn: 60,
  });

  const fileBuffer = await file.arrayBuffer();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: fileBuffer,
  });

  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    console.error("MinIO PUT failed", putRes.status, text);
    return NextResponse.json(
      { error: "Ошибка загрузки в хранилище" },
      { status: 502 },
    );
  }

  const publicUrl = `${config.publicUrl}/${key}`;
  return NextResponse.json({ publicUrl });
}
