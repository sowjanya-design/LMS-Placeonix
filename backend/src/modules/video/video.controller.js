const videoService = require('./video.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

class VideoController {
  // Get a direct upload URL (e.g., from Cloudflare Stream) so the client uploads directly
  // without bottlenecking our Node server.
  getDirectUploadUrl = asyncHandler(async (req, res) => {
    const payload = req.body;
    const user = req.user; 
    
    const result = await videoService.getDirectUploadUrl(user, payload);
    res.status(200).json({ success: true, data: result });
  });

  // Called when the client finishes pushing bytes to the external provider
  finalizeUpload = asyncHandler(async (req, res) => {
    const { uid, duration, thumbnail } = req.body;
    
    await videoService.finalizeUpload(uid, duration, thumbnail);
    res.status(200).json({ success: true, message: 'Upload finalized' });
  });

  // Cloudflare webhook receiver (handles encoding ready, errors, etc.)
  handleWebhook = asyncHandler(async (req, res) => {
    const payload = req.body;
    // TODO: Verify the Cloudflare webhook signature to prevent spoofing
    
    await videoService.handleWebhook(payload);
    res.status(200).send('Webhook processed');
  });

  getVideoById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    
    const result = await videoService.getVideoById(user, id);
    res.status(200).json({ success: true, data: result });
  });

  updateVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    const result = await videoService.updateVideo(user, id, updateData);
    res.status(200).json({ success: true, data: result });
  });

  deleteVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    await videoService.deleteVideo(user, id);
    res.status(200).json({ success: true, message: 'Video deleted successfully' });
  });

  getVideosByCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const user = req.user;
    
    const result = await videoService.getVideosByCourse(user, courseId);
    res.status(200).json({ success: true, data: result });
  });

  // Local fallback for dev environment without Cloudflare keys
  mockCloudflareUpload = asyncHandler(async (req, res) => {
    const uid = req.file ? `local_video_${req.file.filename}` : `mock-cf-video-${Date.now()}`;
    res.status(200).json({ success: true, result: { uid } });
  });
}

module.exports = new VideoController();
