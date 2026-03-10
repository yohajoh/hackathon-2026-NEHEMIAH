import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis;

// Use unpooled connection for better performance with Neon
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

console.log("📦 Connecting to database...");

const pool = new pg.Pool({
  connectionString,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false }
});

const adapter = globalForPrisma.__prismaPgAdapter || new PrismaPg(pool);

const prisma =
  globalForPrisma.__prismaClient ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaPgAdapter = adapter;
  globalForPrisma.__prismaClient = prisma;
}

console.log("✅ Database connected");

export { prisma };
