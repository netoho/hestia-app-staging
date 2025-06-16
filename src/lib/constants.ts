import type { Package, Testimonial, NavItem } from './types';
import { Home, Users, Briefcase, Info, ShieldQuestion, FileText, Mail, Building2, UserCircle, Settings, LogOut, LayoutDashboard, UserPlus, PackageSearch } from 'lucide-react';

export const SITE_NAME = "HestiaGuard";
export const COMPANY_LEGAL_NAME = "HestiaGuard Solutions S.A. de C.V."; // Example legal name
export const CONTACT_EMAIL = "info@hestiaguard.com";
export const CONTACT_PHONE = "+52 55 1234 5678";


export const PACKAGES_DATA: Package[] = [
  {
    id: 'basic',
    name: 'Basic Shield',
    price: '$49',
    description: 'Essential investigation services to ensure tenant reliability.',
    features: ['Tenant Background Check', 'Credit Report Summary', 'Eviction History Search'],
    ctaText: 'Get Started',
    ctaLink: '/register?package=basic',
  },
  {
    id: 'standard',
    name: 'Standard Secure',
    price: '$99',
    description: 'Comprehensive protection including lease support and initial guarantees.',
    features: ['All Basic Shield Features', 'Customizable Lease Agreement Template', 'Rent Payment Guarantee (1 Month)', 'Basic Legal Consultation'],
    ctaText: 'Choose Standard',
    ctaLink: '/register?package=standard',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium Fortress',
    price: '$199',
    description: 'Ultimate peace of mind with full contract management and extensive coverage.',
    features: ['All Standard Secure Features', 'Full Contract Lifecycle Management', 'Extended Rent Guarantee (3 Months)', 'Comprehensive Legal Assistance', 'Eviction Process Coverage'],
    ctaText: 'Opt for Premium',
    ctaLink: '/register?package=premium',
  },
];

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 't1',
    name: 'Ana López',
    role: 'Property Owner',
    quote: "HestiaGuard revolutionized how I manage my rentals. Their Standard Secure package is a perfect balance of features and affordability. Highly recommended!",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'woman portrait',
  },
  {
    id: 't2',
    name: 'David Chen',
    role: 'Renter',
    quote: "Finding a new apartment was stressful, but HestiaGuard's process made me feel secure about my lease. The transparency is commendable.",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'man smiling',
  },
  {
    id: 't3',
    name: 'Sofia Müller',
    role: 'Real Estate Advisor',
    quote: "I always advise my clients to use HestiaGuard. It simplifies negotiations and provides robust protection, benefiting everyone involved.",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'professional woman',
  },
];

export const PUBLIC_NAVIATION_LINKS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/real-estate-advisors', label: 'For Advisors', icon: Users },
  { href: '/property-owners', label: 'For Owners', icon: Building2 },
  { href: '/about-us', label: 'About HestiaGuard', icon: Info },
  { href: '/#packages', label: 'Packages', icon: Briefcase},
];

export const FOOTER_LINKS: NavItem[] = [
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/faq', label: 'FAQ' },
];

export const OWNER_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/policies', label: 'My Policies', icon: FileText },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export const RENTER_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/my-policy', label: 'My Policy', icon: FileText },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export const STAFF_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/users', label: 'Manage Users', icon: Users },
  { href: '/dashboard/policies', label: 'Manage Policies', icon: FileText },
  { href: '/dashboard/packages', label: 'Manage Packages', icon: PackageSearch },
  { href: '/dashboard/profile', label: 'My Profile', icon: UserCircle },
  { href: '/dashboard/system-settings', label: 'System Settings', icon: Settings },
];

export const FAQ_DATA = [
  {
    question: "What is HestiaGuard?",
    answer: "HestiaGuard offers guarantee policy services for property rentals, providing security and peace of mind for property owners, renters, and real estate advisors."
  },
  {
    question: "How do I sign up for a package?",
    answer: "You can sign up by visiting our 'Packages' section on the website, choosing the package that best suits your needs, and clicking the 'Get Started' or similar button. This will guide you through the registration process."
  },
  {
    question: "What information is needed for a policy?",
    answer: "For renters, personal identification, proof of income, and credit information are typically required. Property owners need to provide details about the property. Specific requirements may vary based on the package and local regulations."
  },
  {
    question: "Can I upgrade my package?",
    answer: "Yes, you can typically upgrade your package. Please contact our support team or check your dashboard for options on how to upgrade."
  },
  {
    question: "Who pays for the policy?",
    answer: "Payment responsibility can vary. Sometimes the property owner covers the cost, sometimes the renter, and often it's shared. This is usually agreed upon during the lease negotiation."
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    id: "1",
    title: "Choose Your Package",
    description: "Select from our range of packages tailored to your specific needs, whether you're an owner, renter, or advisor.",
    icon: PackageSearch,
    dataAiHint: "select package"
  },
  {
    id: "2",
    title: "Register & Provide Info",
    description: "Sign up on our platform and fill in the necessary details. Owners list properties, renters provide personal information for screening.",
    icon: UserPlus,
    dataAiHint: "user registration"
  },
  {
    id: "3",
    title: "Verification & Approval",
    description: "Our team processes the information, conducts necessary checks, and approves the policy application.",
    icon: ShieldQuestion,
    dataAiHint: "security check"
  },
  {
    id: "4",
    title: "Secure Your Rental",
    description: "Once approved and payment is complete, your rental is secured with HestiaGuard's protection. Access your documents anytime.",
    icon: FileText,
    dataAiHint: "contract document"
  }
];
