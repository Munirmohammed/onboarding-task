const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUND = 10;

async function registerUser(phone, password) {
  const userExist = await prisma.user.findUnique({ where: { phone } });
  if (userExist) {
    const error = new Error("User already exists.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUND);
  const user = await prisma.user.create({ data: { phone, passwordHash } });
  return {
    id: user.id,
    phone: user.phone,
    totalScore: user.totalScore,
    coins: user.coins,
    createdAt: user.createdAt,
  };
}

async function loginUser(phone, password) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  return { token };
}

module.exports = { registerUser, loginUser };
