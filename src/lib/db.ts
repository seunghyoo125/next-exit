import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.VERCEL ? "file:/tmp/dev.db" : "file:dev.db");
const databaseAuthToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

const adapter = new PrismaLibSql({
  url: databaseUrl,
  ...(databaseAuthToken ? { authToken: databaseAuthToken } : {}),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
