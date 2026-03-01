import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

// Ensure upload directories exist
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const JD_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "job-descriptions");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(JD_UPLOAD_DIR)) {
  fs.mkdirSync(JD_UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

// File filter - only allow images
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed."));
  }
};

// Create multer instance
export const logoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Get the public URL for an uploaded logo
export function getLogoUrl(filename: string): string {
  return `/uploads/logos/${filename}`;
}

// Delete a logo file
export function deleteLogo(filename: string): boolean {
  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    logger.server.error("Error deleting logo", { filename }, error);
    return false;
  }
}

// Extract filename from URL
export function getFilenameFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/uploads\/logos\/([^/]+)$/);
  return match ? match[1] : null;
}

// ─── Job Description Upload ───────────────────────────────────────────────────

const jdStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, JD_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const jdFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExts = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, or DOCX files are allowed for job descriptions."));
  }
};

export const jdUpload = multer({
  storage: jdStorage,
  fileFilter: jdFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

export function getJdFileUrl(filename: string): string {
  return `/uploads/job-descriptions/${filename}`;
}
