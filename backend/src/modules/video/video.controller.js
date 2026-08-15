const videoService = require('./video.service');

class VideoController {
  async getDirectUploadUrl(req, res) {
    try {
      const payload = req.body;
      const user = req.user; 
      const result = await videoService.getDirectUploadUrl(user, payload);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async handleWebhook(req, res) {
    try {
      // Cloudflare webhook payload
      const payload = req.body;
      // Verification logic can be added here
      await videoService.handleWebhook(payload);
      res.status(200).send('Webhook processed');
    } catch (error) {
      res.status(400).send('Webhook failed');
    }
  }

  async getVideoById(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const result = await videoService.getVideoById(user, id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateVideo(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = req.user;

      const result = await videoService.updateVideo(user, id, updateData);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async deleteVideo(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      await videoService.deleteVideo(user, id);
      res.status(200).json({ success: true, message: 'Video deleted successfully' });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }

  async getVideosByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const user = req.user;
      
      const result = await videoService.getVideosByCourse(user, courseId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(403).json({ success: false, message: error.message });
    }
  }
}

module.exports = new VideoController();
