const prisma = require("../config/prisma");
const logger = require("../config/logger");
const smsQueue = require("../modules/sms/sms.queue");
const smsAdapter = require("../modules/sms/sms.adapter");

/**
 * SMS Worker — processes jobs from the "sms" Bull queue.
 *
 * Each job:
 *  1. Calls the Twilio adapter.
 *  2. Updates SmsLog to SENT or FAILED accordingly.
 *
 * Bull handles retries automatically based on queue defaultJobOptions.
 */
smsQueue.process(5, async (job) => {
  // concurrency = 5 (5 Twilio calls in parallel max)
  const { logId, phone, message } = job.data;

  try {
    await smsAdapter.send(phone, message);

    await prisma.smsLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    logger.info({ msg: "SMS delivered", logId, phone });
  } catch (err) {
    const isLastAttempt = job.attemptsMade + 1 >= job.opts.attempts;

    await prisma.smsLog.update({
      where: { id: logId },
      data: {
        status: isLastAttempt ? "FAILED" : "PENDING",
        attempts: { increment: 1 },
      },
    });

    logger.error({ msg: "SMS delivery failed", logId, phone, error: err.message });
    throw err; // rethrow so Bull retries the job
  }
});

smsQueue.on("failed", (job, err) => {
  logger.error({ msg: "SMS job exhausted retries", jobId: job.id, error: err.message });
});

smsQueue.on("error", (err) => {
  logger.error({ msg: "SMS queue error", error: err.message });
});

logger.info("SMS worker started (concurrency=5)");