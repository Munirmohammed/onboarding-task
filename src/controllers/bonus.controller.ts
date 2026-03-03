import { Request, Response } from 'express';
import fs from 'fs';
import csv from 'csv-parser';
import { Queue } from 'bullmq';
import { prisma } from '../lib/prisma.js';

// Connect to the same Redis queue
const smsQueue = new Queue('sms-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

export const uploadBonusFile = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No CSV file uploaded' });
    return;
  }

  const results: any[] = [];
  const batchId = `batch_${Date.now()}`;
  const COIN_BONUS_AMOUNT = 50; // Every user gets 50 coins

  // Use a Stream to read the file row by row without crashing memory
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Clean up the uploaded file to save disk space
      fs.unlinkSync(req.file!.path);

      console.log(`[BONUS] Processing ${results.length} records...`);

      let successCount = 0;
      let duplicateCount = 0;

      // Process in chunks of 100 to avoid locking the database
      const CHUNK_SIZE = 100;
      for (let i = 0; i < results.length; i += CHUNK_SIZE) {
        const chunk = results.slice(i, i + CHUNK_SIZE);
        
        // Use a Transaction for data integrity
        await prisma.$transaction(async (tx) => {
          for (const row of chunk) {
            // The CSV header must be "phone_number"
            const phone = row.phone_number; 

            if (!phone) continue;

            // 1. Check for duplicates in this batch
            const existingBonus = await tx.bonusTransaction.findFirst({
              where: { batch_id: batchId, phone_number: phone }
            });

            if (existingBonus) {
              duplicateCount++;
              continue;
            }

            // 2. Record the bonus transaction
            await tx.bonusTransaction.create({
              data: { batch_id: batchId, phone_number: phone }
            });

            // 3. Give the user coins (Create user if they don't exist, or update if they do)
            await tx.user.upsert({
              where: { phone_number: phone },
              update: { coins: { increment: COIN_BONUS_AMOUNT } },
              create: { 
                phone_number: phone, 
                password_hash: 'temp_hash', // In a real app, generate a random password
                coins: COIN_BONUS_AMOUNT 
              }
            });

            // 4. Create SMS Log
            await tx.smsLog.create({
              data: {
                phone_number: phone,
                message: `You received ${COIN_BONUS_AMOUNT} bonus coins!`,
                status: 'QUEUED'
              }
            });

            // 5. Add to Queue for background processing
            await smsQueue.add('send-sms', {
              phoneNumber: phone,
              message: `You received ${COIN_BONUS_AMOUNT} bonus coins!`
            });

            successCount++;
          }
        });
      }

      res.status(200).json({
        message: 'Bulk processing completed',
        totalProcessed: results.length,
        successfulBonuses: successCount,
        duplicatesSkipped: duplicateCount,
        batchId
      });
    });
};