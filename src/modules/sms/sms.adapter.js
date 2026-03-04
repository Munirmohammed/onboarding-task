/**
 * SMS Adapter — Twilio implementation.
 *
 * To swap providers, replace only this file.
 * The rest of the codebase calls smsAdapter.send(phone, message).
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER   (E.164 format, e.g. +15005550006)
 */

const config = require("../../config");
const logger = require("../../config/logger");

// Lazily require twilio so the app boots without it in test env
function getClient() {
  const twilio = require("twilio");
  return twilio(config.twilio.accountSid, config.twilio.authToken);
}

/**
 * @param {string} to      - E.164 phone number
 * @param {string} message - SMS body
 * @returns {Promise<{ sid: string }>}
 */
async function send(to, message) {
  if (config.nodeEnv === "test") {
    logger.debug({ msg: "[SMS MOCK]", to, message });
    return { sid: "TEST_SID" };
  }

  const client = getClient();
  const result = await client.messages.create({
    from: config.twilio.fromNumber,
    to,
    body: message,
  });

  logger.info({ msg: "SMS sent", sid: result.sid, to });
  return { sid: result.sid };
}

module.exports = { send };