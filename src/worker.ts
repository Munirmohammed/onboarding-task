import { Worker } from 'bullmq';
import { prisma } from './lib/prisma.js';
import { sendMockSMS } from './lib/sms.js';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const smsWorker = new Worker('sms-queue', async (job) => {
  const { phoneNumber, message } = job.data;

  console.log(`[WORKER] Processing SMS for ${phoneNumber}...`);

  try {
    // 1. Log as QUEUED (already done by producer, but let's be safe)
    
    // 2. Call Mock SMS API
    await sendMockSMS(phoneNumber, message);

    // 3. Update DB to DELIVERED
    await prisma.smsLog.updateMany({
      where: { 
        phone_number: phoneNumber,
        status: 'QUEUED'
      },
      data: { status: 'DELIVERED' }
    });

    console.log(`[WORKER] SMS Delivered to ${phoneNumber}`);

  } catch (error) {
    console.error(`[WORKER] SMS Failed for ${phoneNumber}`);

    // 4. Update DB to FAILED
    await prisma.smsLog.updateMany({
      where: { 
        phone_number: phoneNumber,
        status: 'QUEUED'
      },
      data: { status: 'FAILED' }
    });
  }
}, { connection });

console.log('🚀 SMS Worker Started');