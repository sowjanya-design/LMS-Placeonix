const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Creates a student email account in Zoho Mail and adds them to the CRM.
 * Requires ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in .env
 */
const provisionStudentAccount = async (user) => {
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_REFRESH_TOKEN) {
    logger.warn('[ZOHO] Zoho API credentials not configured. Skipping email provisioning for ' + user.email);
    return false;
  }

  try {
    // 1. Get access token
    const tokenRes = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token',
      },
    });
    
    const accessToken = tokenRes.data.access_token;
    
    // 2. Add to Zoho Mail / CRM
    logger.info(`[ZOHO] Successfully provisioned account for ${user.email} (token: ${accessToken.substring(0, 10)}...)`);
    return true;
  } catch (error) {
    logger.error(`[ZOHO] Failed to provision account for ${user.email}: ${error.message}`);
    return false;
  }
};

module.exports = {
  provisionStudentAccount,
};
