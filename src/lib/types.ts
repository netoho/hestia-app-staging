

export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  ctaText?: string | null;
  ctaLink: string;
  highlight?: boolean | null;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl: string;
  dataAiHint: string;
}

export type UserRole = 'owner' | 'renter' | 'staff' | 'admin' | 'broker' | 'tenant' | 'landlord';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type PolicyStatus = 'draft' | 'sent_to_tenant' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'denied';

export interface Policy {
  id: string;
  broker: { id: string; name: string; email: string } | null;
  tenant: { id: string; name: string; email: string } | null;
  landlord: { id: string; name: string; email: string } | null;
  property: {
    address: string;
    type: string;
    data: any;
  };
  coverage: any;
  status: PolicyStatus;
  premium: number;
  startDate: string;
  endDate: string;
  payer: string;
  createdAt: string;
  updatedAt: string;
}
