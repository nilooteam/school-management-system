import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Bahar | Prisma client for standalone Node.js hosting.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./db/custom.db'
  return new PrismaClient({ adapter: new PrismaLibSql({ url }), log: ['error'] })
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
