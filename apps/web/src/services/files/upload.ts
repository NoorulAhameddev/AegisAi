import multer from "multer";
import path from "path";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_: any, file: any, cb: any) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (
    _: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type ${file.mimetype} not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
        ),
      );
    }
  },
});
