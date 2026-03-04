const Bull = require("bull");
const config = require("../../config");

/**
 * Single shared Bull queue for all outbound SMS.
 * The queue is created once and re-used across the process.
 */
const smsQueue = new Bull("sms", {
  redis: config.redis.url,
  defaultJobOptions: {
    attempts: 3,                  // retry up to 3 times on failure
    backoff: { type: "exponential", delay: 5000 }, // 5s → 25s → 125s
    removeOnComplete: 500,        // keep last 500 completed jobs for auditing
    removeOnFail: 200,
  },
});

module.exports = smsQueue;