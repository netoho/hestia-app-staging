
import { PrismaClient } from '@/prisma/generated/prisma-client/client'
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg'

const config = {
  transactionOptions: { timeout: 300000, maxwait: 300000 },
}

if (process.env.IS_LOCAL === 'local') {
  // @ts-ignore
  config['adapter'] = new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
} else {
  // @ts-ignore
  config['adapter'] = new PrismaPostgresAdapter({
    connectionString: process.env.DATABASE_URL!,
  })
}

export const prisma = new PrismaClient(config)

export default prisma;
