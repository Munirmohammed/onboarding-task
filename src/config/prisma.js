const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const logger = require("./logger");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
  ],
});

if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` });
  });
}

prisma.$on("error", (e) => logger.error(e));

module.exports = prisma;