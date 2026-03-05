const prisma = require("../prisma");

exports.getStats = async () => {
  const totalUsers = await prisma.user.count();

  const totalAttempts = await prisma.questionAttempt.count();

  const avgScore = await prisma.quizSession.aggregate({
    _avg: {
      score: true,
    },
  });

  return {
    totalUsers,
    totalAttempts,
    averageScore: avgScore._avg.score || 0,
  };
};

exports.getNotificationStats = async () => {
  const stats = await prisma.notification.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
  });

  const result = {
    pending: 0,
    sent: 0,
    failed: 0,
  };

  stats.forEach((item) => {
    result[item.status.toLowerCase()] = item._count.status;
  });

  return result;
};
