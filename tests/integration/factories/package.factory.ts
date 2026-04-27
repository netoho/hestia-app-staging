import { Factory } from 'fishery';
import type { Package } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

export const packageFactory = Factory.define<Package>(({ sequence, onCreate }) => {
  onCreate(async (pkg) => prisma.package.create({ data: pkg }));
  return {
    id: `pkg-${sequence}-${Date.now()}`,
    name: `Test Package ${sequence}`,
    price: 4000,
    description: 'Test package',
    features: JSON.stringify({ INVESTIGACIÓN: ['Test'] }),
    ctaText: 'Test',
    ctaLink: '/test',
    highlight: false,
    percentage: null,
    minAmount: null,
    shortDescription: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Package;
});
