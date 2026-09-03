const axios = require("axios");

class CloudflareService {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Request a Direct Upload URL from Cloudflare Stream
   * This allows the frontend to upload a video directly without passing it through our backend
   */
  async createDirectUploadUrl(maxDurationSeconds = 3600) {
    // Graceful fallback for local development without Cloudflare keys
    if (!this.accountId || !this.apiToken) {
      console.warn(
        "Missing Cloudflare credentials. Using mock direct upload URL.",
      );
      const uid = `mock-cf-video-${Date.now()}`;
      return {
        uploadUrl: `http://localhost:5000/api/v1/videos/mock-cloudflare-upload`,
        uid,
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/direct_upload`,
        {
          maxDurationSeconds,
          requireSignedURLs: true,
        },
        { headers: this.getHeaders() },
      );

      return {
        uploadUrl: response.data.result.uploadURL,
        uid: response.data.result.uid,
      };
    } catch (error) {
      console.error(
        "Error creating direct upload URL:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to create direct upload URL");
    }
  }

  /**
   * Delete a video from Cloudflare Stream
   */
  async deleteVideo(uid) {
    try {
      await axios.delete(`${this.baseUrl}/${uid}`, {
        headers: this.getHeaders(),
      });
      return true;
    } catch (error) {
      console.error(
        "Error deleting video:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to delete video");
    }
  }

  /**
   * Get Video Details
   */
  async getVideoDetails(uid) {
    try {
      const response = await axios.get(`${this.baseUrl}/${uid}`, {
        headers: this.getHeaders(),
      });
      return response.data.result;
    } catch (error) {
      console.error(
        "Error getting video details:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to get video details");
    }
  }

  /**
   * Generate a Signed Playback URL
   * Needed if requireSignedURLs is true
   */
  async generatePlaybackUrl(uid) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${uid}/token`,
        {
          exp: Math.floor(Date.now() / 1000) + 3600, // Token valid for 1 hour
        },
        { headers: this.getHeaders() },
      );

      const token = response.data.result.token;
      return `https://customer-<YOUR_SUBDOMAIN>.cloudflarestream.com/${token}/iframe`;
      // Alternatively, return just the token if the frontend uses the Stream React component
      // return token;
    } catch (error) {
      console.error(
        "Error generating playback URL:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to generate signed playback URL");
    }
  }

  /**
   * Handle Webhooks (Optional depending on usage)
   */
  handleWebhook(payload) {
    // Implement webhook validation and handling logic
    // Cloudflare sends webhooks when video status changes (e.g. ready)
    return payload;
  }
}

module.exports = new CloudflareService();
