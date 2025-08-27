import multer from "multer";
import path from "path";
import fs from "fs";
import {logger} from "../utils/logger.js";


const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/';
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '10485760'; // 10MB default

if (!UPLOAD_DIR) {
    throw new Error('UPLOAD_DIR environment variable is not set.');
}

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, {recursive: true});
    logger.info(`Created upload directory at ${UPLOAD_DIR}`);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);  // Local storage
    }, filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// File filter: Allow only documents (e.g., PDF, DOCX, etc.) – customize as needed
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|jpg|png|jpeg|pages/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    logger.warn(`Invalid file type attempted: ${file.originalname}`);
    cb(new Error('Invalid file type. Only documents and images allowed.'));
};

const upload = multer({
    storage, limits: {fileSize: parseInt(MAX_FILE_SIZE, 10)}, fileFilter
});

export const uploadSingle = upload.single("document");

export const uploadMultiple = upload.array('documents', 5); // Max 5 files


// Error handling wrapper
export const handleUpload = (uploadHandler) => {
    return (req, res, next) => {
        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                logger.error(`Upload error: ${err.message}`);
                return res.status(400).json({error: `Upload error: ${err.message}`});
            } else if (err) {
                logger.error(`Upload error: ${err.message}`);
                return res.status(400).json({error: err.message});
            }
            next();
        });
    };
};