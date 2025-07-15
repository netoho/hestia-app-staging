import prisma from '@/lib/prisma';
import { isEmulator } from '../env-check';

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

const mockPackages: Package[] = [
  {
    id: 'mock-package-1',
    name: 'Basic Plan (Mock)',
    price: 100,
    description: 'A basic package for testing.',
    features: ['Feature A', 'Feature B'],
    ctaText: 'Learn More',
    ctaLink: '/register?package=basic',
    highlight: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mock-package-2',
    name: 'Pro Plan (Mock)',
    price: 500,
    description: 'A professional package with more features.',
    features: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
    ctaText: 'Learn More',
    ctaLink: '/register?package=basic',
    highlight: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const getPackages = async (): Promise<Package[]> => {
  if (isEmulator()) {
    console.log('Running in Firebase emulator, returning mock packages.');
    // In a real scenario, you might want to filter/paginate mock data
    return mockPackages;
  } else {
    console.log('Not running in emulator, fetching packages from database.');
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
