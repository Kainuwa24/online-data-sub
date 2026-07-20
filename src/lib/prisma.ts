import { PrismaClient } from "@prisma/client";

// Prevents hot-reload in dev from spawning a new PrismaClient per reload.
// After schema changes, drop a stale client that is missing new models.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient();
}

function isStaleClient(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  // New models must exist on the client after `prisma generate`
  return typeof (client as unknown as { magicLinkToken?: unknown }).magicLinkToken === "undefined";
}

if (isStaleClient(globalForPrisma.prisma)) {
  void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
