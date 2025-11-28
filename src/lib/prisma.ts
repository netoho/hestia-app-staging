
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({ transactionOptions: { timeout: 300000, maxWait: 300000 } })

export default prisma;
