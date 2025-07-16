import prisma from '@/lib/prisma';
import { isMockEnabled } from '../env-check';
import { MockDataService } from './mockDataService';

// Define the structure of your package data
interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  highlight: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const getPackages = async (): Promise<Package[]> => {
  if (isMockEnabled()) {
    console.log('Mock mode enabled, returning mock packages from seed data.');
    const mockPackages = await MockDataService.getPackages();
    return mockPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      features: JSON.parse(pkg.features),
      ctaText: pkg.ctaText,
      ctaLink: pkg.ctaLink,
      highlight: pkg.highlight,
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
      features: JSON.parse(pkg.features),
      ctaText: pkg.ctaText,
      ctaLink: pkg.ctaLink,
      highlight: pkg.highlight,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    }))
  }
};
