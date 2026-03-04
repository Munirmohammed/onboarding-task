const { Queue } = require("bullmq");
const notificationQueue = new Queue("scoreNotificationQueue", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});
module.exports = {notificationQueue};
