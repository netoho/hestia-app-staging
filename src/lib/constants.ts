import type { Package, Testimonial, NavItem } from './types';
import { Home, Users, Briefcase, Info, ShieldQuestion, FileText, Mail, Building2, UserCircle, Settings, LogOut, LayoutDashboard, UserPlus, PackageSearch } from 'lucide-react';

export const SITE_NAME = "Hestia";
export const COMPANY_LEGAL_NAME = "Soluciones Hestia S.A. de C.V.";
export const CONTACT_EMAIL = "info@hestia.com";
export const CONTACT_PHONE = "+52 55 1234 5678";


export const PACKAGES_DATA: Package[] = [
  {
    id: 'basic',
    name: 'Escudo Básico',
    price: '$49',
    description: 'Servicios esenciales de investigación para asegurar la fiabilidad del inquilino.',
    features: ['Verificación de antecedentes del inquilino', 'Resumen de informe de crédito', 'Búsqueda de historial de desalojos'],
    ctaText: 'Comenzar',
    ctaLink: '/register?package=basic',
  },
  {
    id: 'standard',
    name: 'Seguro Estándar',
    price: '$99',
    description: 'Protección integral que incluye soporte en el contrato y garantías iniciales.',
    features: ['Todas las funciones de Escudo Básico', 'Plantilla de contrato de arrendamiento personalizable', 'Garantía de pago de renta (1 mes)', 'Consulta legal básica'],
    ctaText: 'Elegir Estándar',
    ctaLink: '/register?package=standard',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Fortaleza Premium',
    price: '$199',
    description: 'Tranquilidad total con gestión completa del contrato y cobertura extendida.',
    features: ['Todas las funciones de Seguro Estándar', 'Gestión del ciclo de vida completo del contrato', 'Garantía de renta extendida (3 meses)', 'Asistencia legal integral', 'Cobertura del proceso de desalojo'],
    ctaText: 'Optar por Premium',
    ctaLink: '/register?package=premium',
  },
];

export const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 't1',
    name: 'Ana López',
    role: 'Propietaria',
    quote: "Hestia revolucionó cómo administro mis alquileres. Su paquete Seguro Estándar es un balance perfecto de funciones y precio. ¡Muy recomendado!",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'woman portrait',
  },
  {
    id: 't2',
    name: 'David Chen',
    role: 'Inquilino',
    quote: "Encontrar un nuevo apartamento fue estresante, pero el proceso de Hestia me hizo sentir seguro con mi contrato. La transparencia es admirable.",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'man smiling',
  },
  {
    id: 't3',
    name: 'Sofia Müller',
    role: 'Asesora Inmobiliaria',
    quote: "Siempre recomiendo a mis clientes usar Hestia. Simplifica las negociaciones y proporciona una protección robusta, beneficiando a todos los involucrados.",
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'professional woman',
  },
];

export const PUBLIC_NAVIATION_LINKS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/real-estate-advisors', label: 'Para Asesores', icon: Users },
  { href: '/property-owners', label: 'Para Propietarios', icon: Building2 },
  { href: '/about-us', label: 'Sobre Hestia', icon: Info },
  { href: '/#packages', label: 'Paquetes', icon: Briefcase},
];

export const FOOTER_LINKS: NavItem[] = [
  { href: '/terms-and-conditions', label: 'Términos y Condiciones' },
  { href: '/privacy-policy', label: 'Política de Privacidad' },
  { href: '/contact', label: 'Contáctanos' },
  { href: '/faq', label: 'Preguntas Frecuentes' },
];

export const OWNER_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/policies', label: 'Mis Pólizas', icon: FileText },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export const RENTER_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/my-policy', label: 'Mi Póliza', icon: FileText },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export const STAFF_DASHBOARD_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, matchExact: true },
  { href: '/dashboard/users', label: 'Gestionar Usuarios', icon: Users },
  { href: '/dashboard/policies', label: 'Gestionar Pólizas', icon: FileText },
  { href: '/dashboard/packages', label: 'Gestionar Paquetes', icon: PackageSearch },
  { href: '/dashboard/profile', label: 'Mi Perfil', icon: UserCircle },
  { href: '/dashboard/system-settings', label: 'Config. del Sistema', icon: Settings },
];

export const FAQ_DATA = [
  {
    question: "¿Qué es Hestia?",
    answer: "Hestia ofrece servicios de pólizas de garantía para alquileres de propiedades, proporcionando seguridad y tranquilidad a propietarios, inquilinos y asesores inmobiliarios."
  },
  {
    question: "¿Cómo me registro en un paquete?",
    answer: "Puedes registrarte visitando nuestra sección de 'Paquetes' en el sitio web, eligiendo el que mejor se adapte a tus necesidades y haciendo clic en el botón 'Comenzar' o similar. Esto te guiará a través del proceso de registro."
  },
  {
    question: "¿Qué información se necesita para una póliza?",
    answer: "Para los inquilinos, generalmente se requiere identificación personal, comprobante de ingresos e información crediticia. Los propietarios deben proporcionar detalles sobre la propiedad. Los requisitos específicos pueden variar según el paquete y las regulaciones locales."
  },
  {
    question: "¿Puedo cambiar mi paquete a uno superior?",
    answer: "Sí, generalmente puedes mejorar tu paquete. Por favor, contacta a nuestro equipo de soporte o revisa tu panel de control para ver las opciones de actualización."
  },
  {
    question: "¿Quién paga por la póliza?",
    answer: "La responsabilidad del pago puede variar. A veces, el propietario cubre el costo, a veces el inquilino, y a menudo se comparte. Esto generalmente se acuerda durante la negociación del contrato de arrendamiento."
  }
];

export const HOW_IT_WORKS_STEPS = [
  {
    id: "1",
    title: "Elige tu Paquete",
    description: "Selecciona entre nuestra gama de paquetes diseñados para tus necesidades específicas, ya seas propietario, inquilino o asesor.",
    icon: PackageSearch,
    dataAiHint: "select package"
  },
  {
    id: "2",
    title: "Regístrate y Proporciona Info",
    description: "Regístrate en nuestra plataforma y completa los detalles necesarios. Los propietarios listan propiedades, los inquilinos proporcionan información personal para la evaluación.",
    icon: UserPlus,
    dataAiHint: "user registration"
  },
  {
    id: "3",
    title: "Verificación y Aprobación",
    description: "Nuestro equipo procesa la información, realiza las verificaciones necesarias y aprueba la solicitud de la póliza.",
    icon: ShieldQuestion,
    dataAiHint: "security check"
  },
  {
    id: "4",
    title: "Asegura tu Alquiler",
    description: "Una vez aprobado y completado el pago, tu alquiler está asegurado con la protección de Hestia. Accede a tus documentos en cualquier momento.",
    icon: FileText,
    dataAiHint: "contract document"
  }
];
