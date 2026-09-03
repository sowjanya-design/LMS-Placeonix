const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// On serverless platforms (Vercel/Lambda) the project dir is read-only and
// /tmp is ephemeral per invocation — a file written by one request can be
// gone by the next. Local disk storage only works for a persistent server.
const isServerless = !!(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const s3Configured = !!(
  process.env.S3_BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

if (isServerless && !s3Configured) {
  logger.error(
    "File uploads are running on a serverless platform WITHOUT S3 configured — " +
      "uploaded files (avatars, documents, submissions) will silently disappear between invocations. " +
      "Set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION to fix this.",
  );
}

const maxSize = (Number(process.env.MAX_FILE_UPLOAD) || 10) * 1024 * 1024;

const safeFilename = (originalname) => {
  const hash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalname).toLowerCase();
  const safeName = path
    .basename(originalname, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 40);
  return `${Date.now()}-${hash}-${safeName}${ext}`;
};

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowedTypes.includes(ext)) return cb(null, true);
  cb(
    new AppError(
      `File type .${ext} not allowed. Allowed: ${allowedTypes.join(", ")}`,
      400,
    ),
  );
};

let storage;
let uploadDir; // only meaningful for disk storage

if (s3Configured) {
  // ── S3-backed storage — survives serverless invocations ──
  const { S3Client } = require("@aws-sdk/client-s3");
  const multerS3 = require("multer-s3");

  const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });

  storage = (subdir) =>
    multerS3({
      s3,
      bucket: process.env.S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) =>
        cb(null, `${subdir}/${safeFilename(file.originalname)}`),
    });

  logger.info(`File uploads: using S3 bucket "${process.env.S3_BUCKET}"`);
} else {
  // ── Local disk storage — dev/local server only, not durable on serverless ──
  uploadDir =
    process.env.FILE_UPLOAD_PATH ||
    (isServerless ? "/tmp/uploads" : "./uploads");
  try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    // read-only filesystem — disk uploads won't work here, but boot must not crash
  }

  const ensureDir = (subdir) => {
    const dir = path.join(uploadDir, subdir);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      /* read-only fs */
    }
    return dir;
  };

  storage = (subdir) =>
    multer.diskStorage({
      destination: (req, file, cb) => cb(null, ensureDir(subdir)),
      filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
    });
}

// ── Pre-configured uploaders ──

const avatarUpload = multer({
  storage: storage("avatars"),
  fileFilter: fileFilter(["jpg", "jpeg", "png", "webp"]),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const documentUpload = multer({
  storage: storage("documents"),
  fileFilter: fileFilter(["pdf", "doc", "docx", "txt"]),
  limits: { fileSize: maxSize },
});

const submissionUpload = multer({
  storage: storage("submissions"),
  fileFilter: fileFilter([
    "pdf",
    "zip",
    "png",
    "jpg",
    "jpeg",
    "doc",
    "docx",
    "txt",
  ]),
  limits: { fileSize: maxSize },
});

const courseAssetUpload = multer({
  storage: storage("courses"),
  fileFilter: fileFilter(["jpg", "jpeg", "png", "webp", "mp4", "pdf"]),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for videos
});

const videoUpload = multer({
  storage: storage("videos"),
  fileFilter: fileFilter(["mp4", "mov", "avi", "mkv", "webm"]),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});
// ── Helpers ──

const buildFileUrl = (req, file, subdir) => {
  // multer-s3 populates file.location with the real S3 URL; disk storage
  // only gives us file.filename, so build the local /uploads/... URL.
  if (file && file.location) return file.location;
  const filename = typeof file === "string" ? file : file.filename;
  return `${req.protocol}://${req.get("host")}/uploads/${subdir}/${filename}`;
};

const deleteFile = (filepath) => {
  if (s3Configured) {
    // Cross-cutting delete for S3 keys is handled where the caller has the
    // full key (subdir/filename); disk-only helper below is a no-op on S3.
    return false;
  }
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
  } catch (err) {
    logger.error(`Failed to delete file ${filepath}: ${err.message}`);
  }
  return false;
};

module.exports = {
  avatarUpload,
  documentUpload,
  submissionUpload,
  courseAssetUpload,
  buildFileUrl,
  deleteFile,
  videoUpload,
  uploadDir,
  s3Configured,
};
