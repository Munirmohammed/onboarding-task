require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const logger = require("./config/logger");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const gameRoutes = require("./modules/game/game.routes");
const coinsRoutes = require("./modules/coins/coins.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

// Start background workers
require("./workers/smsWorker");
require("./workers/coinsBonusWorker");

const app = express();

// ── Security & perf middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "10mb" })); // 10mb to allow bulk phone CSVs
app.use(express.urlencoded({ extended: true }));

// Global rate limit — 200 req/min per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/coins", coinsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

module.exports = app; // exported for tests