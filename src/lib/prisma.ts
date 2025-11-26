
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({ transactionOptions: { timeout: 30000,  maxWait: 30000 } })

export default prisma;
