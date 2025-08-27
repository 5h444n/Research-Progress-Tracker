import express from 'express';
import {uploadSingle as uploadSingleController} from "../controllers/uploadController.js";
import {authenticateToken, authorizeRole} from "../middleware/authMiddleware.js";
import {handleUpload, uploadSingle} from "../middleware/uploadMiddleware.js";


const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole('user', 'admin'));

router.post('/upload', handleUpload(uploadSingle), uploadSingleController);

export default router;