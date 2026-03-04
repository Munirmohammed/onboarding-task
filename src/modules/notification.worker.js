const { Worker } = require("bullmq");
const prisma = require("./prisma");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

new Worker(
  "scoreNotificationQueue",
  async (job) => {
    const { userId, score } = job.data;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const message = `Congrats! You reached ${score} points! Keep playing!`;

    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        status: "PENDING",
      },
    });
    try {
      const formattedPhone = user.phone.replace("0", "+251");
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "SENT" },
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          error: error.message,
        },
      });
      throw error;
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  },
);
