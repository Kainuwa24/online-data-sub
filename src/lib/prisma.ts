import { PrismaClient } from "@prisma/client";

/**
 * Hot-reload can keep an old PrismaClient that was generated before a schema
 * change (e.g. missing User.passwordHash). Bump SCHEMA_VERSION when you add
 * fields/models so the singleton is recreated.
 */
const SCHEMA_VERSION = 3; // 3 = passwordHash on User

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

function createClient() {
  return new PrismaClient();
}

function isStaleClient(client: PrismaClient | undefined): boolean {
  if (!client) return false;
  if (globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) return true;

  // Runtime model check (survives generate without a version bump)
  const runtime = client as unknown as {
    _runtimeDataModel?: {
      models?: Record<string, { fields?: Record<string, unknown> | Array<{ name: string }> }>;
    };
  };
  const userModel = runtime._runtimeDataModel?.models?.User;
  if (userModel?.fields) {
    if (Array.isArray(userModel.fields)) {
      const names = userModel.fields.map((f) => f.name);
      if (!names.includes("passwordHash")) return true;
    } else if (!("passwordHash" in userModel.fields)) {
      return true;
    }
  }

  // Older check: magic link model must exist
  if (typeof (client as unknown as { magicLinkToken?: unknown }).magicLinkToken === "undefined") {
    return true;
  }

  return false;
}

if (isStaleClient(globalForPrisma.prisma)) {
  void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}
