import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Run all count queries in parallel for performance
    const [totalUsers, totalGames, smsStats] = await Promise.all([
      prisma.user.count(),
      prisma.gameSession.count(),
      prisma.smsLog.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })
    ]);

    // Format SMS stats into a readable object
    const smsMetrics = {
      queued: 0,
      delivered: 0,
      failed: 0
    };

    smsStats.forEach(stat => {
      if (stat.status === 'QUEUED') smsMetrics.queued = stat._count.status;
      if (stat.status === 'DELIVERED') smsMetrics.delivered = stat._count.status;
      if (stat.status === 'FAILED') smsMetrics.failed = stat._count.status;
    });

    res.status(200).json({
      totalUsers,
      totalGamesPlayed: totalGames,
      smsMetrics
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};