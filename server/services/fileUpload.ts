/**
 * File Upload Service
 *
 * Configures Multer for file reception and delegates storage to storageService.ts.
 * In production (STORAGE_PROVIDER=s3): files are streamed to S3/R2.
 * In development: files are written to local disk.
 *
 * Multer now uses memoryStorage — files are buffered in memory briefly,
 * then passed to storageService. This is safe for files up to 10 MB.
 */

import multer from "multer";
import { uploadFile, deleteFile, getFileUrl, urlToKey } from "./storageService";
import { createLogger } from "../lib/logger";

const log = createLogger("FileUpload");

// ─── Multer instances (memoryStorage — no disk writes by Multer itself) ────────

const imageFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // SVG excluded — can contain executable scripts (XSS risk)
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."));
  }
};

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const jdFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, or DOCX files are allowed for job descriptions."));
  }
};

export const jdUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: jdFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── Storage helpers ───────────────────────────────────────────────────────────

export interface SavedFile {
  url: string; // Public URL (store this in DB)
  key: string; // Storage key (use for deletion)
}

/**
 * Persist an uploaded logo to storage and return its public URL + key.
 * Call this after logoUpload middleware processes the request.
 */
export async function saveLogoFile(file: Express.Multer.File): Promise<SavedFile> {
  const result = await uploadFile(file.buffer, file.originalname, file.mimetype, "logos");
  log.info("Logo saved", { key: result.key, size: file.size });
  return result;
}

/**
 * Persist an uploaded job description to storage and return its public URL + key.
 * Call this after jdUpload middleware processes the request.
 */
export async function saveJdFile(file: Express.Multer.File): Promise<SavedFile> {
  const result = await uploadFile(file.buffer, file.originalname, file.mimetype, "job-descriptions");
  log.info("JD file saved", { key: result.key, size: file.size });
  return result;
}

/**
 * Delete a file by its storage key or legacy URL.
 * Accepts either:
 *   - A storage key: "logos/uuid.png"
 *   - A legacy local URL: "/uploads/logos/uuid.png"
 */
export async function deleteUploadedFile(keyOrUrl: string): Promise<void> {
  const key = keyOrUrl.startsWith("/uploads/") ? (urlToKey(keyOrUrl) ?? keyOrUrl) : keyOrUrl;
  await deleteFile(key);
}

/**
 * Get the public URL for a stored file key.
 * Forwards to storageService — use when you have a key but need a URL.
 */
export { getFileUrl };

// ─── Legacy compatibility shims ───────────────────────────────────────────────
// These allow existing code that calls getLogoUrl/deleteLogo to continue working
// during migration. New code should use saveLogoFile/deleteUploadedFile instead.

/**
 * @deprecated Use saveLogoFile(file) instead — this returns a URL synchronously
 * for legacy callers that pass a pre-saved filename, not an uploaded buffer.
 */
export function getLogoUrl(key: string): string {
  return getFileUrl(key.startsWith("/") ? (urlToKey(key) ?? key) : `logos/${key}`);
}

/**
 * @deprecated Use deleteUploadedFile(key) instead.
 */
export function deleteLogo(filenameOrKey: string): void {
  const key = filenameOrKey.includes("/") ? filenameOrKey : `logos/${filenameOrKey}`;
  deleteFile(key).catch((err) => {
    log.warn("deleteLogo failed", { key }, err);
  });
}

/**
 * @deprecated Use deleteUploadedFile(key) instead.
 */
export function getJdFileUrl(key: string): string {
  return getFileUrl(`job-descriptions/${key}`);
}

/**
 * Extract a storage key from a legacy local URL.
 * e.g. "/uploads/logos/uuid.png" → "logos/uuid.png"
 */
export function getFilenameFromUrl(url: string): string | null {
  return urlToKey(url);
}
