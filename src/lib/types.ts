

// Import Package from prisma client for consistency
export type { Package } from "@/prisma/generated/prisma-client/enums";

// Import enums from centralized generated file
import { UserRole, PolicyStatus } from "@/prisma/generated/prisma-client/enums";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl: string;
  dataAiHint: string;
}

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
  icon: string;
  dataAiHint: string;
}

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
