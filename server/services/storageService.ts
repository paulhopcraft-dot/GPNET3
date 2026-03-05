/**
 * Storage Service — portable file upload abstraction
 *
 * In production (NODE_ENV=production OR STORAGE_PROVIDER=s3):
 *   Uploads files to AWS S3 or any S3-compatible provider (Cloudflare R2, etc.)
 *
 * In development (default):
 *   Writes files to local disk at public/uploads/ (existing behaviour)
 *
 * Environment variables:
 *   STORAGE_PROVIDER      'local' | 's3'   (default: 'local' in dev, 's3' in prod)
 *   AWS_S3_BUCKET         S3 bucket name
 *   AWS_S3_REGION         AWS region (default: ap-southeast-2)
 *   AWS_ACCESS_KEY_ID     AWS credentials
 *   AWS_SECRET_ACCESS_KEY AWS credentials
 *   AWS_S3_ENDPOINT       Override endpoint URL for R2/MinIO/etc.
 *   AWS_S3_PUBLIC_URL     Public base URL for serving files (e.g. CDN)
 *                         If not set, generates S3 HTTPS URLs
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createLogger } from "../lib/logger";

const logger = createLogger("StorageService");

// ─── Provider selection ───────────────────────────────────────────────────────

type StorageProvider = "local" | "s3";

function getProvider(): StorageProvider {
  const explicit = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (explicit === "s3") return "s3";
  if (explicit === "local") return "local";
  // Default: s3 in production, local in development
  return process.env.NODE_ENV === "production" ? "s3" : "local";
}

// ─── Local disk storage ───────────────────────────────────────────────────────

const LOCAL_BASE = path.join(process.cwd(), "public", "uploads");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function localUpload(
  buffer: Buffer,
  filename: string,
  subdir: string
): Promise<string> {
  const dir = path.join(LOCAL_BASE, subdir);
  ensureDir(dir);
  const ext = path.extname(filename).toLowerCase();
  const key = `${subdir}/${randomUUID()}${ext}`;
  const fullPath = path.join(LOCAL_BASE, subdir, path.basename(key));
  await fs.promises.writeFile(fullPath, buffer);
  logger.debug("Local upload complete", { key, size: buffer.length });
  return key;
}

function localGetUrl(key: string): string {
  // key is e.g. "logos/uuid.png" → URL is "/uploads/logos/uuid.png"
  return `/uploads/${key}`;
}

async function localDelete(key: string): Promise<void> {
  const fullPath = path.join(LOCAL_BASE, key);
  await fs.promises.unlink(fullPath).catch(() => {
    // ignore missing file
  });
}

// ─── S3 storage ───────────────────────────────────────────────────────────────

async function getS3Client() {
  // Dynamic import — only load SDK when S3 is the active provider
  const { S3Client } = await import("@aws-sdk/client-s3");

  const region = process.env.AWS_S3_REGION ?? "ap-southeast-2";
  const endpoint = process.env.AWS_S3_ENDPOINT; // For R2/MinIO

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
        }
      : undefined, // Fall back to IAM role/instance profile in AWS
  });
}

async function s3Upload(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  subdir: string
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not set. Configure S3 bucket name.");
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  const ext = path.extname(filename).toLowerCase();
  const key = `uploads/${subdir}/${randomUUID()}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // Private by default — use presigned URLs or CDN for access
    })
  );

  logger.debug("S3 upload complete", { bucket, key, size: buffer.length });
  return key;
}

function s3GetUrl(key: string): string {
  // If a public CDN URL is configured, use it
  const publicUrl = process.env.AWS_S3_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }

  const bucket = process.env.AWS_S3_BUCKET ?? "bucket";
  const region = process.env.AWS_S3_REGION ?? "ap-southeast-2";
  const endpoint = process.env.AWS_S3_ENDPOINT;

  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function s3Delete(key: string): Promise<void> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) return;

  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch((err) => {
    logger.warn("S3 delete failed", { key }, err);
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkStorageHealth(): Promise<{ ok: boolean; provider: string; error?: string }> {
  const provider = getProvider();

  if (provider === "local") {
    try {
      ensureDir(LOCAL_BASE);
      return { ok: true, provider: "local" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, provider: "local", error: msg };
    }
  }

  // S3 — check bucket is configured
  if (!process.env.AWS_S3_BUCKET) {
    return { ok: false, provider: "s3", error: "AWS_S3_BUCKET not set" };
  }

  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET }));
    return { ok: true, provider: "s3" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, provider: "s3", error: msg };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface UploadResult {
  key: string;   // Storage key (use with getFileUrl)
  url: string;   // Public URL
}

/**
 * Upload a file buffer to the configured storage provider.
 *
 * @param buffer    File data
 * @param filename  Original filename (used to extract extension)
 * @param mimetype  MIME type of the file
 * @param subdir    Subdirectory within uploads (e.g. "logos", "job-descriptions")
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  subdir = "misc"
): Promise<UploadResult> {
  const provider = getProvider();

  const key = provider === "s3"
    ? await s3Upload(buffer, filename, mimetype, subdir)
    : await localUpload(buffer, filename, subdir);

  const url = getFileUrl(key);
  return { key, url };
}

/**
 * Get the public URL for a stored file key.
 */
export function getFileUrl(key: string): string {
  const provider = getProvider();
  return provider === "s3" ? s3GetUrl(key) : localGetUrl(key);
}

/**
 * Delete a stored file by its key.
 */
export async function deleteFile(key: string): Promise<void> {
  const provider = getProvider();
  if (provider === "s3") {
    await s3Delete(key);
  } else {
    await localDelete(key);
  }
}

/**
 * Extract the storage key from a legacy local URL path.
 * e.g. "/uploads/logos/uuid.png" → "logos/uuid.png"
 * Used to migrate existing records from URL to key format.
 */
export function urlToKey(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/uploads\/(.+)$/);
  return match ? match[1] : null;
}
