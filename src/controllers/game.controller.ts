import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js'; 
import { randomUUID } from 'crypto';

// 1. Start Game: Generates a unique session ID (nonce) to prevent replay attacks
export const startGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Generate a secure random nonce
    const nonce = randomUUID();

    // Store it in the DB. We will check this later when they submit the score.
    const session = await prisma.gameSession.create({
      data: {
        userId,
        nonce,
        is_used: false, // It hasn't been used yet
      }
    });

    res.status(200).json({ 
      message: 'Game started', 
      sessionId: session.id,
      nonce: session.nonce 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Submit Score: Validates the nonce to ensure this isn't a replay attack
export const submitScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { sessionId, nonce, score } = req.body;

    if (!sessionId || !nonce || score === undefined) {
      res.status(400).json({ error: 'Missing sessionId, nonce, or score' });
      return;
    }

    // Find the session in the DB
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId }
    });

    // SECURITY CHECK 1: Does the session exist and belong to this user?
    if (!session || session.userId !== userId) {
      res.status(403).json({ error: 'Invalid session' });
      return;
    }

    // SECURITY CHECK 2: Does the nonce match?
    if (session.nonce !== nonce) {
      res.status(403).json({ error: 'Invalid nonce' });
      return;
    }

    // SECURITY CHECK 3 (The Replay Attack Stopper): Has this token been used already?
    if (session.is_used) {
      res.status(409).json({ error: 'Replay attack detected! This session has already been submitted.' });
      return;
    }

    // If all checks pass:
    // 1. Mark the session as used (so it can't be used again)
    // 2. Add the score to the user's total points
    // We use a Transaction to ensure both happen or neither happens.
    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: { is_used: true }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { score: { increment: score } }
      })
    ]);

    res.status(200).json({ message: 'Score submitted successfully', newScore: score });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};