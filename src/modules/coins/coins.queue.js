const Bull = require("bull");
const config = require("../../config");

const coinsQueue = new Bull("coin-bonus", {
  redis: config.redis.url,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
});

module.exports = coinsQueue;