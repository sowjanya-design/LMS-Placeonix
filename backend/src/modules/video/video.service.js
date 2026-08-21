const videoRepository = require('./video.repository');
const cloudflareService = require('./cloudflare.service');

class VideoService {
  async getDirectUploadUrl(user, payload) {
    if (user.role !== 'mentor' && user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Unauthorized to upload videos');
    }

    const { uploadUrl, uid } = await cloudflareService.createDirectUploadUrl();

    const videoData = {
      courseId: payload.courseId,
      lessonId: payload.lessonId,
      title: payload.title,
      description: payload.description || '',
      videoUID: uid,
      uploadedBy: user._id,
      status: 'pending',
    };

    await videoRepository.createVideo(videoData);

    return { uploadUrl, uid };
  }

  async handleWebhook(payload) {
    // Basic implementation: if video is ready, update status in DB
    if (payload && payload.uid) {
      const status = payload.status && payload.status.state === 'ready' ? 'ready' : 'processing';
      const duration = payload.meta && payload.meta.duration ? payload.meta.duration : 0;
      const thumbnail = payload.thumbnail || '';
      
      await videoRepository.updateVideoByUID(payload.uid, {
        status,
        duration,
        thumbnail
      });
    }
  }

  async finalizeUpload(uid, duration = 0, thumbnail = '') {
    await videoRepository.updateVideoByUID(uid, {
      status: 'ready',
      duration,
      thumbnail
    });
  }

  async getVideoById(user, id) {
    const video = await videoRepository.findVideoById(id);
    if (!video) throw new Error('Video not found');

    // Here we can generate a signed playback URL if requested
    const playbackToken = await cloudflareService.generatePlaybackUrl(video.videoUID);
    return { video, playbackToken };
  }

  async updateVideo(user, id, updateData) {
    const video = await videoRepository.findVideoById(id);
    if (!video) throw new Error('Video not found');

    if (user.role !== 'admin' && user.role !== 'super_admin' && String(video.uploadedBy) !== String(user._id)) {
      throw new Error('Unauthorized to update this video');
    }

    return await videoRepository.updateVideo(id, updateData);
  }

  async deleteVideo(user, id) {
    const video = await videoRepository.findVideoById(id);
    if (!video) throw new Error('Video not found');

    if (user.role !== 'admin' && user.role !== 'super_admin' && String(video.uploadedBy) !== String(user._id)) {
      throw new Error('Unauthorized to delete this video');
    }

    await cloudflareService.deleteVideo(video.videoUID);
    await videoRepository.deleteVideo(id);

    return true;
  }

  async getVideosByCourse(user, courseId) {
    // You could check if user is enrolled in this course here
    const videos = await videoRepository.findVideosByCourse(courseId);
    return videos;
  }
}

module.exports = new VideoService();
