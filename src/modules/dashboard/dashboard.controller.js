const Joi       = require("joi");
const prisma    = require("../../config/prisma");
const smsService = require("../sms/sms.service");
const coinsService = require("../coins/coins.service");

const pageSchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(200).default(50),
  status: Joi.string().valid("PENDING", "SENT", "FAILED").optional(),
});

function validate(schema, data) {
  const { error, value } = schema.validate(data, { allowUnknown: false });
  if (error) throw Object.assign(error, { isJoi: true });
  return value;
}

// ── GET /api/dashboard/stats ─────────────────────────────────
exports.stats = async (_req, res, next) => {
  try {
    const [userCount, scoreAgg, coinAgg, smsStats] = await Promise.all([
      prisma.user.count(),
      prisma.score.aggregate({ _sum: { points: true }, _count: { _all: true } }),
      prisma.user.aggregate({ _sum: { coins: true } }),
      smsService.getStats(),
    ]);

    res.json({
      users:       { total: userCount },
      scores:      { total: scoreAgg._count._all, pointsAwarded: scoreAgg._sum.points ?? 0 },
      coins:       { totalInCirculation: coinAgg._sum.coins ?? 0 },
      sms:         smsStats,
    });
  } catch (e) { next(e); }
};

// ── GET /api/dashboard/users ──────────────────────────────────────────
exports.users = async (req, res, next) => {
  try {
    const { page, limit } = validate(pageSchema, req.query);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, username: true, phone: true, coins: true, createdAt: true },
      }),
      prisma.user.count(),
    ]);

    res.json({ items, total, page, limit });
  } catch (e) { next(e); }
};

// ── GET /api/dashboard/scores ───────────────────
exports.scores = async (req, res, next) => {
  try {
    const { page, limit } = validate(pageSchema, req.query);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.score.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, points: true, createdAt: true,
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.score.count(),
    ]);

    res.json({ items, total, page, limit });
  } catch (e) { next(e); }
};

// ── GET /api/dashboard/sms ──────────────────────────────────────────────
exports.smsLogs = async (req, res, next) => {
  try {
    const { page, limit, status } = validate(pageSchema, req.query);
    res.json(await smsService.getLogs({ status, page, limit }));
  } catch (e) { next(e); }
};

// ── GET /api/dashboard/coin-batches ────────────────────────────
exports.coinBatches = async (req, res, next) => {
  try {
    res.json(await coinsService.listBatches());
  } catch (e) { next(e); }
};  