const { v4: uuidv4 } = require("uuid");
const prisma = require("../../config/prisma");
const smsQueue = require("./sms.queue");

/**
 * Enqueue an SMS for delivery.
 *
 * 1. Persist a SmsLog row (PENDING) — source of truth for dashboard queries.
 * 2. Push job to Bull — worker does the actual Twilio call.
 *
 * @param {{ userId?: string, phone: string, message: string }} opts
 * @returns {Promise<{ logId: string }>}
 */
async function enqueue({ userId = null, phone, message }) {
  const log = await prisma.smsLog.create({
    data: { id: uuidv4(), userId, phone, message },
  });

  await smsQueue.add({ logId: log.id, phone, message }, { jobId: log.id });

  return { logId: log.id };
}

/**
 * Paginated list of SMS logs — used by dashboard.
 */
async function getLogs({ status, page = 1, limit = 50 }) {
  const where = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, phone: true, message: true,
        status: true, attempts: true, sentAt: true, createdAt: true,
      },
    }),
    prisma.smsLog.count({ where }),
  ]);

  return { items, total, page, limit };
}

/**
 * Aggregate counts per status — used by dashboard stats.
 */
async function getStats() {
  const rows = await prisma.smsLog.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return rows.reduce((acc, r) => {
    acc[r.status] = r._count._all;
    return acc;
  }, { PENDING: 0, SENT: 0, FAILED: 0 });
}

module.exports = { enqueue, getLogs, getStats };