import express from 'express';
import multer from 'multer';
import { submitContact, getContactAttachment } from '../controllers/contactController.js';

const router = express.Router();

const ALLOWED_TYPES = /^(image\/|audio\/)|^application\/pdf$|^application\/msword$|^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/;

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file, matches the frontend cap
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.test(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'), false);
  },
});

router.post('/', attachmentUpload.array('attachments', 5), submitContact);
router.get('/attachment', getContactAttachment);

export default router;
