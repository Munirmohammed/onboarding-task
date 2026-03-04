const { v4: uuidv4 } = require("uuid");
const prisma      = require("../config/prisma");
const logger      = require("../config/logger");
const coinsQueue  = require("../modules/coins/coins.queue");
const smsService  = require("../modules/sms/sms.service");
const config      = require("../config");

const BONUS_AMOUNT = config.coins.bonusAmount; // default 100

// /
// Coin Bonus Worker
// ─────────────────
// Each job carries { batchId, phones: string[] } (up to COIN_BATCH_SIZE numbers).

// For each chunk the worker:
// 1. Looks up users by phone numbers in one query.
// 2. Filters out phones already credited in this batchId.
// 3. Inserts CoinBonus rows and increments user.coins in a single transaction.
// 4. Enqueues an SMS notification for each credited user.

// Duplicate prevention:
//   CoinBonus has a @@unique([userId, batchId]) constraint → DB-level guarantee.
//   The pre-filter in step 2 avoids wasted transaction attempts.

coinsQueue.process(3, async (job) => {
  // concurrency = 3 chunks in parallel
  const { batchId, phones } = job.data;

  // ── 1. Resolve phone → user ────────
  const users = await prisma.user.findMany({
    where: { phone: { in: phones } },
    select: { id: true, phone: true },
  });

  if (!users.length) {
    logger.debug({ msg: "No matching users in chunk", batchId, count: phones.length });
    return { credited: 0 };
  }

  // ── 2. Filter already-credited users in this batch ───────────────────────
  const userIds = users.map((u) => u.id);
  const existing = await prisma.coinBonus.findMany({
    where: { batchId, userId: { in: userIds } },
    select: { userId: true },
  });
  const alreadyCredited = new Set(existing.map((r) => r.userId));
  const eligible = users.filter((u) => !alreadyCredited.has(u.id));

  if (!eligible.length) {
    logger.debug({ msg: "All users in chunk already credited", batchId });
    return { credited: 0 };
  }

  // ── 3. Credit coins atomically ────────────────────
  await prisma.$transaction([
    prisma.coinBonus.createMany({
      data: eligible.map((u) => ({
        id: uuidv4(),
        userId: u.id,
        phone: u.phone,
        amount: BONUS_AMOUNT,
        batchId,
      })),
      skipDuplicates: true, 
    }),
    ...eligible.map((u) =>
      prisma.user.update({
        where: { id: u.id },
        data: { coins: { increment: BONUS_AMOUNT } },
      })
    ),
  ]);

  // ── 4. Enqueue SMS notifications (fire-and-forget, non-blocking) ─────────
  const smsJobs = eligible.map((u) =>
    smsService.enqueue({
      userId: u.id,
      phone: u.phone,
      message: `Congratulations! ${BONUS_AMOUNT} coins have been added to your account.`,
    }).catch((err) =>
      logger.error({ msg: "Failed to enqueue SMS for coin bonus", userId: u.id, error: err.message })
    )
  );
  await Promise.allSettled(smsJobs);

  logger.info({ msg: "Coin bonus chunk processed", batchId, credited: eligible.length });
  return { credited: eligible.length };
});

coinsQueue.on("failed", (job, err) => {
  logger.error({ msg: "Coin bonus job failed", jobId: job.id, error: err.message });
});

coinsQueue.on("error", (err) => {
  logger.error({ msg: "Coin bonus queue error", error: err.message });
});

logger.info("Coin bonus worker started (concurrency=3)");