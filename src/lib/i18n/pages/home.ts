import type { Testimonial, HowItWorksStep } from '../../types';

export const home = {
    heroTitle: "Asegura tu Tranquilidad con Hestia.",
    heroSubtitle: "Protecciones de arrendamiento integrales. Navega el mercado de arrendamiento con confianza.",
    howItWorksTitle: "Cómo Funciona Hestia",
    howItWorksSubtitle: "Un proceso simple y transparente para tu seguridad de arrendamiento.",
    videoTestimonialTitle: "Escucha a Nuestros Clientes",
    videoTestimonialSubtitle: "Descubre cómo Hestia marca la diferencia.",
    packagesTitle: "Nuestros Paquetes de Protección",
    packagesSubtitle: "Elige el nivel de seguridad adecuado para ti.",
    whyChooseTitle: "¿Por Qué Elegir Hestia?",
    whyChooseSubtitle: "Experimenta la tranquilidad con nuestro servicio dedicado a proteger tu arrendamiento.",
    forOwners: "Para Propietarios",
    forOwnersDesc: "Protege tu patrimonio, cumple con las regulaciones, contrato acorde a tus necesidades y minimiza riesgos por incumplimientos al contrato.",
    forRenters: "Para Inquilinos",
    forRentersDesc: "Asegura una estancia segura en tu casa o negocio, revisión de perfil de arrendador, respaldo jurídico para cumplimiento de contrato y derechos como arrendatario y red segura para devolución de deposito.",
    forAdvisors: "Para Asesores",
    forAdvisorsDesc: "Cierra tratos más rápido y ofrece valor añadido a tus clientes. Nuestro proceso simplificado hace que los contratos de arrendamiento sean más fluidos y seguros para las partes.",
    testimonialsTitle: "Con la Confianza de Muchos",
    testimonialsSubtitle: "Escucha lo que nuestros clientes satisfechos tienen que decir sobre Hestia.",
    ctaTitle: "¿Listo para Experimentar tu Arrendamiento Seguro?",
    ctaSubtitle: "Trabaja tu protección con nosotros y transforma tu experiencia de renta. Tenemos una solución para ti.",
    videoTestimonials: [
        { videoId: "CphDJJat9qE", author: "Augusto" },
        { videoId: "Anara--Uzkw", author: "Daniela" },
        { videoId: "R5D5RqgAW5g", author: "Jonathan" },
        { videoId: "v2Rz_QA5y1M", author: "Michelle" },
        { videoId: "Tovue6Bq2qI", author: "Rosa" },
        { videoId: "eemkb_-E_00", author: "Presentación Hestia" },
    ],
    testimonials: [
        { id: 't1', name: 'Claudia Morán', role: 'Asesor Inmobiliario', quote: "La póliza jurídica HESTIA ofrece un servicio confiable, profesional y eficiente. La atención es clara y oportuna, con asesoría legal bien fundamentada y un acompañamiento constante. Brinda seguridad y tranquilidad al saber que se cuenta con un respaldo jurídico serio y comprometido. Muy recomendable.", avatarUrl: '/images/testimonials/claudia.png', dataAiHint: 'man smiling' },
        { id: 't2', name: 'Ernesto Huerta', role: 'Inquilino', quote: "Siempre puedes contar con el equipo de soporte de Hestia, ellos te acompañan en todo el proceso. 100% recomendable.", avatarUrl: '/images/testimonials/neto.png', dataAiHint: 'man smiling' },
        { id: 't3', name: 'Joris Antoine Manuel', role: 'Asesor Inmobiliario', quote: "Trabajar con Protección jurídica Hestia, fue un placer. Nos acompañaron durante todo el proceso de renta con mucho profesionalismo,  y reactividad. Mis clientes y yo  quedamos muy felices de la calidad del servicio y de la atencion que hemos recibido durante todas las operaciones.", avatarUrl: '/images/testimonials/joris.png', dataAiHint: 'man smiling' },
        { id: 't4', name: 'Esteban García Luna', role: 'Asesor Inmobiliario', quote: "Hestia gestiona el riesgo inmobiliario sin fricciones, combinando rigor jurídico, procesos claros y operaciones ordenadas que generan confianza. Con una base sólida y una innovación centrada en el usuario. Es un partner con el que seguiremos colaborando en su próxima etapa.", avatarUrl: '/images/testimonials/esteban.png', dataAiHint: 'man smiling' },
    ] as Testimonial[],
    howItWorksSteps: [
        { id: "1", title: "Elige tu protección.", description: "Selecciona entre nuestra variedad de servicios diseñados para las necesidades de tu arrendamiento.", icon: "/images/icons/package.png", dataAiHint: "select package" },
        { id: "2", title: "Regístrate y proporciona información.", description: "Regístrate en nuestra plataforma y completa los formatos y proporciona la documentación requerida.", icon: "/images/icons/note.png", dataAiHint: "user registration" },
        { id: "3", title: "Verificación y aprobación.", description: "Nuestro equipo analiza la información proporcionada, realiza la investigación correspondiente, emite una opinión de riesgo y te propondra la estrategia correspondiente.", icon: "/images/icons/shield.png", dataAiHint: "security check" },
        { id: "4", title: "Asegura tu arrendamiento.", description: "Una vez aprobada la estrategia propuesta y definidos los terminos, completa el pago y tu arrendamiento estará asegurado con la protección de Hestia. Accede a tus documentos  en cualquier momento.", icon: "/images/icons/search.svg", dataAiHint: "contract document" }
    ] as HowItWorksStep[],
};
