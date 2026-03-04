const { v4: uuidv4 } = require("uuid");
const prisma = require("../../config/prisma");


// GAME RULES (simple points game)
// ─────────────────────────────────
// The client sends an action ("tap", "collect", "dodge") and a one-time
// nonce (UUID) generated client-side for that single move.

// Points per action:
//   tap     → 1 pt
//   collect → 5 pts
//   dodge   → 3 pts

// Replay-attack prevention:
//   The nonce is stored as a UNIQUE column on Score.
//   A duplicate nonce → Prisma P2002 → 409 Conflict.
//   No extra Redis/cache needed — the DB constraint is the lock.


const ACTION_POINTS = { tap: 1, collect: 5, dodge: 3 };

async function play({ userId, action, nonce }) {
  const points = ACTION_POINTS[action];
  if (!points) {
    throw Object.assign(new Error(`Unknown action "${action}"`), { status: 400 });
  }

  // Single transaction: record score + increment user coins atomically
  const [score] = await prisma.$transaction([
    prisma.score.create({
      data: { id: uuidv4(), userId, points, nonce },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: points } },
    }),
  ]);

  return { scoreId: score.id, points, action };
}

async function myScores({ userId, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.score.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, points: true, createdAt: true },
    }),
    prisma.score.count({ where: { userId } }),
  ]);
  return { items, total, page, limit };
}

async function leaderboard(limit = 20) {
  // Aggregate total points per user, ordered descending
  const rows = await prisma.score.groupBy({
    by: ["userId"],
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: limit,
  });

  // Fetch usernames in one query
  const ids = rows.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    username: userMap[r.userId] ?? "unknown",
    totalPoints: r._sum.points ?? 0,
  }));
}

module.exports = { play, myScores, leaderboard };