const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
const SALT_ROUND = 10;

const VERIFY_SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID;

async function sendOTP(phone) {
  const user = await prisma.user.findUnique({
    where: { phone },
  });
  if (!user) {
    throw new Error("User not found.");
  }
  const formattedPhone = phone.replace("0", "+251");
  await client.verify.v2.services(VERIFY_SERVICE).verifications.create({
    to: formattedPhone,
    channel: "sms",
  });
  return { message: "OTP sent successfully" };
}

async function resetPassword(phone, code, newPassword) {
  const formattedPhone = phone.replace("0", "+251");
  const result = await client.verify.v2
    .services(VERIFY_SERVICE)
    .verificationChecks.create({
      to: formattedPhone,
      code,
    });
  if (result.status !== "approved") {
    throw new Error("Invalid or expired OTP");
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUND);
  await prisma.user.update({
    where: { phone },
    data: { passwordHash },
  });
  return { message: "Password updated successfully." };
}

module.exports = { sendOTP, resetPassword };
