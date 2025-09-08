import prisma from '@/lib/prisma';
import { isMockEnabled } from '../env-check';
import { MockDataService } from './mockDataService';
import { Package } from '@/lib/prisma-types';

export const getPackages = async (): Promise<Package[]> => {
  if (isMockEnabled()) {
    console.log('Mock mode enabled, returning mock packages from seed data.');
    const mockPackages = await MockDataService.getPackages();
    return mockPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      features: pkg.features, // Keep as string - component will parse it
      ctaText: pkg.ctaText,
      ctaLink: pkg.ctaLink,
      highlight: pkg.highlight,
      percentage: pkg.percentage ?? null,
      minAmount: pkg.minAmount ?? null,
      shortDescription: pkg.shortDescription ?? null,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }));
  } else {
    console.log('Production mode, fetching packages from database.');
    const packages = await prisma.package.findMany();
    return packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      features: pkg.features, // Keep as string - component will parse it
      ctaText: pkg.ctaText,
      ctaLink: pkg.ctaLink,
      highlight: pkg.highlight,
      percentage: pkg.percentage ?? null,
      minAmount: pkg.minAmount ?? null,
      shortDescription: pkg.shortDescription ?? null,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }))
  }
};
