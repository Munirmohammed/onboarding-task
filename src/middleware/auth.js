const jwt = require("jsonwebtoken");
const config = require("../config");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
};