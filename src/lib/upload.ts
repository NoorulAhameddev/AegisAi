import multer from "multer";
import path from "path";

export const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (_: any, file: any, cb: any) => {
            cb(null, Date.now() + path.extname(file.originalname));
        },
    }),
});
