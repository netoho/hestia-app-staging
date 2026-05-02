import type { NavItem } from '../types';
import { Home, Users, Briefcase, Info, FileText, Building2, UserCircle, LayoutDashboard, PackageSearch } from 'lucide-react';

export interface SidebarGroupDef {
    key: 'operacion' | 'gestion' | 'configuracion';
    label: string;
    items: NavItem[];
}

const operacionItems: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, matchExact: true },
    { href: '/dashboard/policies', label: 'Protecciones', icon: FileText },
];

const gestionItems: NavItem[] = [
    { href: '/dashboard/users', label: 'Usuarios', icon: Users },
    { href: '/dashboard/packages', label: 'Paquetes', icon: PackageSearch },
];

const configuracionItems: NavItem[] = [
    { href: '/dashboard/profile', label: 'Mi perfil', icon: UserCircle },
];

const adminGroups: SidebarGroupDef[] = [
    { key: 'operacion', label: 'OPERACIÓN', items: operacionItems },
    { key: 'gestion', label: 'GESTIÓN', items: gestionItems },
    { key: 'configuracion', label: 'CONFIGURACIÓN', items: configuracionItems },
];

const staffGroups: SidebarGroupDef[] = [
    { key: 'operacion', label: 'OPERACIÓN', items: operacionItems },
    { key: 'gestion', label: 'GESTIÓN', items: gestionItems },
    { key: 'configuracion', label: 'CONFIGURACIÓN', items: configuracionItems },
];

const brokerGroups: SidebarGroupDef[] = [
    { key: 'operacion', label: 'OPERACIÓN', items: operacionItems },
    { key: 'configuracion', label: 'CONFIGURACIÓN', items: configuracionItems },
];

export const layout = {
    root: {
        metaTitle: "Hestia PLP - Protecciones de Arrendamiento",
        metaDescription: "Asegura tus contratos de arrendamiento con Hestia. Protecciones de garantía integrales para propietarios e inquilinos.",
        metaKeywords: ['protección de arrendamiento', 'garantía de alquiler', 'seguro de propiedad', 'evaluación de inquilinos', 'protección para propietarios', 'hestia'],
    },
    publicHeader: {
        navLinks: [
          { href: '/', label: 'Inicio', icon: Home },
          { href: '/real-estate-advisors', label: 'Para Asesores', icon: Users },
          { href: '/property-owners', label: 'Para Propietarios', icon: Building2 },
          { href: '/about-us', label: 'Sobre Hestia', icon: Info },
          { href: '/#packages', label: 'Paquetes', icon: Briefcase},
        ] as NavItem[],
        login: "Iniciar Sesión",
        register: "Registrarse",
        gotoDashboard: "Ir al Dashboard",
        openMenu: "Abrir menú",
        closeMenu: "Cerrar menú",
    },
    publicFooter: {
        description: "Protecciones de arrendamiento integrales, tranquilidad tanto a propietarios como a inquilinos.",
        address: "Calle 5 de febrero 637, Torre 4, interior 6, colonia Álamos, código postal 03400, Benito Juárez, Ciudad de México",
        quickLinks: "Enlaces Rápidos",
        legal: "Legal",
        sitemap: "Mapa del Sitio",
        newsletter: "Boletín Informativo",
        newsletterDescription: "Mantente actualizado con nuestras últimas noticias y ofertas.",
        copyright: "Todos los derechos reservados.",
        madeWithLove: "Hecho con ❤️ en la Ciudad de México.",
        footerLinks: [
          { href: '/terms-and-conditions', label: 'Términos y Condiciones' },
          { href: '/privacy-policy', label: 'Política de Privacidad' },
          { href: '/contact', label: 'Contáctanos' },
          { href: '/faq', label: 'Preguntas Frecuentes' },
        ] as NavItem[],
    },
    newsletterForm: {
        emailPlaceholder: "Ingresa tu correo",
        subscribe: "Suscribirse"
    },
    dashboardLayout: {
        searchPlaceholder: "Buscar...",
        viewNotifications: "Ver notificaciones",
        copyright: "Todos los derechos reservados.",
    },
    dashboardSidebar: {
        adminGroups,
        staffGroups,
        brokerGroups,
        userMenu: {
            profile: "Perfil",
            settings: "Configuración",
            notifications: "Notificaciones",
            logout: "Cerrar sesión"
        }
    },
};
