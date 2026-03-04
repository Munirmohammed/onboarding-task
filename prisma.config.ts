import path from "path";
import { defineConfig } from "prisma/config";

// Load .env manually so DATABASE_URL is available
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.join(__dirname, ".env") });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma/schema.prisma"),
  // Prisma v7 requires the URL to be passed right here for migrations:
  datasource: {
    url: process.env.DATABASE_URL,
  },
});