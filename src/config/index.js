require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "fallback_dev_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || "10", 10),
  },
  sms: {
    gatewayUrl: process.env.SMS_GATEWAY_URL,
    apiKey: process.env.SMS_GATEWAY_API_KEY,
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },
  coins: {
    batchSize: parseInt(process.env.COIN_BATCH_SIZE || "500", 10),
    bonusAmount: 100, // coins credited per phone number in bulk upload
  },
};