export interface Package {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText?: string;
  ctaLink: string;
  highlight?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl: string;
  dataAiHint: string;
}

export type UserRole = 'owner' | 'renter' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ElementType;
  children?: NavItem[];
  matchExact?: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface HowItWorksStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  dataAiHint: string;
}
