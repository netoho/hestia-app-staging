import { PrismaClient } from '@/prisma/generated/prisma-client/client'
import { PrismaPg } from '@prisma/adapter-pg';

export const prisma = new PrismaClient({
  transactionOptions: { timeout: 300000, maxWait: 300000 },
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  })
})

export default prisma;
