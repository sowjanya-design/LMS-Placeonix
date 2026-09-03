const logger = require("../utils/logger");

// Uses Meta's WhatsApp Cloud API directly (no reseller markup, free
// developer tier) rather than a wrapper like Twilio — same shape as
// emailService.js: falls back to logging when not configured, so this is
// fully wired and testable today, functional the moment real credentials
// (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) are added to .env.
// See https://developers.facebook.com/docs/whatsapp/cloud-api.
const API_VERSION = "v20.0";

const isConfigured = () =>
  !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

/**
 * Sends a plain-text WhatsApp message. `to` must be an E.164-ish number
 * (digits only, country code first — e.g. "919876543210"); non-digit
 * characters are stripped since that's what the Cloud API expects.
 * Never throws — a WhatsApp send failing must not fail the request it's
 * attached to, same rule as sendEmail's callers already follow.
 */
async function sendWhatsAppMessage({ to, body }) {
  const digitsOnly = String(to || "").replace(/\D/g, "");
  if (!digitsOnly) {
    logger.warn("sendWhatsAppMessage: no valid phone number, skipping");
    return { skipped: true };
  }

  if (!isConfigured()) {
    logger.info(`[WHATSAPP FALLBACK] To: ${digitsOnly} | ${body}`);
    return { skipped: true };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: digitsOnly,
          type: "text",
          text: { body },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      logger.error(
        `WhatsApp send failed to ${digitsOnly}: ${JSON.stringify(data)}`,
      );
      return { error: data };
    }
    logger.info(`WhatsApp message sent to ${digitsOnly}`);
    return data;
  } catch (err) {
    logger.error(`WhatsApp send request failed: ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { sendWhatsAppMessage, isConfigured };
