const Video = require("./video.model");

class VideoRepository {
  async createVideo(data) {
    const video = new Video(data);
    return await video.save();
  }

  async findVideoById(id) {
    return await Video.findById(id);
  }

  async findVideoByUID(uid) {
    return await Video.findOne({ videoUID: uid });
  }

  async updateVideo(id, updateData) {
    return await Video.findByIdAndUpdate(id, updateData, { new: true });
  }

  async updateVideoByUID(uid, updateData) {
    return await Video.findOneAndUpdate({ videoUID: uid }, updateData, {
      new: true,
    });
  }

  async deleteVideo(id) {
    return await Video.findByIdAndDelete(id);
  }

  async findVideosByCourse(courseId) {
    return await Video.find({ courseId }).sort({ createdAt: -1 });
  }

  async findVideosByLesson(lessonId) {
    return await Video.find({ lessonId }).sort({ createdAt: -1 });
  }
}

module.exports = new VideoRepository();
