import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
    seed: "tsx backend/prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});