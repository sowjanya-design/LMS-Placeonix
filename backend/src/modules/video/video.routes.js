const express = require('express');
const router = express.Router();
const videoController = require('./video.controller');
const videoValidator = require('./video.validator');

// Placeholder for protect middleware (import from your actual auth middleware)
const protect = (req, res, next) => {
  if (!req.user) {
    req.user = { _id: '64b1f1c7d3f2e1a4c8a2b5e2', role: 'Mentor' }; // Mock fallback
  }
  next();
};

// POST /videos/direct-upload
router.post(
  '/direct-upload',
  protect,
  videoValidator.validateUploadRequest,
  videoValidator.handleValidationErrors,
  videoController.getDirectUploadUrl
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
