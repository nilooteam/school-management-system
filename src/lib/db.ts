import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type DbClient = PrismaClient;
type DbPath = (string | symbol)[];

const globalForPrisma = globalThis as unknown as {
  localPrisma?: PrismaClient;
};

function createLocalClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./db/custom.db";
  return new PrismaClient({
    adapter: new PrismaLibSql({ url }),
    log: ["error"],
  });
}

/** Create a request-scoped Prisma client bound to Cloudflare D1. */
export const getDb = cache((): DbClient => {
  try {
    const { env } = getCloudflareContext();
    if (env.DB) {
      return new PrismaClient({
        adapter: new PrismaD1(env.DB),
        log: ["error"],
      });
    }
  } catch {
    // Local Node.js development uses the LibSQL adapter below.
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudflare D1 binding DB is missing. Check the Worker D1 binding.");
  }

  globalForPrisma.localPrisma ??= createLocalClient();
  return globalForPrisma.localPrisma;
});

/**
 * Backwards-compatible lazy Prisma proxy. Existing db.user.findMany() calls
 * resolve to a request-scoped client without rewriting every call site.
 */
function createDbProxy(path: DbPath = []): unknown {
  const target = function () {};
  return new Proxy(target, {
    get(_target, property) {
      if (property === "then") return undefined;
      if (property === Symbol.toStringTag) return "BaharPrismaClient";
      return createDbProxy([...path, property]);
    },
    apply(_target, _thisArg, args) {
      return Promise.resolve(getDb()).then((client) => {
        let parent: any = client;
        for (const key of path.slice(0, -1)) parent = parent[key as any];
        const method = parent[path[path.length - 1] as any];
        return method.apply(parent, args);
      });
    },
  });
}

export const db = createDbProxy() as PrismaClient;
