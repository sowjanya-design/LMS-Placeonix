const express = require('express');
const router = express.Router();
const videoController = require('./video.controller');
const videoValidator = require('./video.validator');

const { protect } = require('../../middleware/auth');
const { videoUpload } = require('../../services/uploadService');
// POST /videos/direct-upload
router.post(
  '/direct-upload',
  protect,
  videoValidator.validateUploadRequest,
  videoValidator.handleValidationErrors,
  videoController.getDirectUploadUrl
);

// POST /videos/mock-cloudflare-upload (Local Dev Mock)
router.post(
  '/mock-cloudflare-upload',
  videoUpload.single('file'),
  videoController.mockCloudflareUpload
);

// POST /videos/finalize (Frontend fallback)
router.post(
  '/finalize',
  protect,
  videoController.finalizeUpload
);
// POST /videos/webhook
router.post(
  '/webhook',
  videoController.handleWebhook
);

// GET /videos/:id
router.get(
  '/:id',
  protect,
  videoController.getVideoById
);

// PUT /videos/:id
router.put(
  '/:id',
  protect,
  videoController.updateVideo
);

// DELETE /videos/:id
router.delete(
  '/:id',
  protect,
  videoController.deleteVideo
);

// GET /videos/course/:courseId
router.get(
  '/course/:courseId',
  protect,
  videoController.getVideosByCourse
);

module.exports = router;
