import { isDemoMode } from './env-check';

let prisma: any;

if (!isDemoMode()) {
  // Only import Prisma when not in demo mode
  const { PrismaClient } = require('@prisma/client');
  
  const prismaClientSingleton = () => {
    return new PrismaClient();
  };

  declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
  }

  prisma = globalThis.prisma ?? prismaClientSingleton();

  if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
} else {
  // In demo mode, return null - services should use DemoORM instead
  prisma = null;
}

export default prisma;
