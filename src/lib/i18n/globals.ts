export const globals = {
    // Global & Reusable
    siteName: "Hestia",
    companyLegalName: "Hestia Protección Legal y Patrimonial S.A.S de C.V.",
    contactEmail: "contacto@hestiaplp.com.mx",
    contactPhone: "55 1277 0883 | 55 2111 7610",

    actions: {
        start: "Comenzar",
        chooseStandard: "Elegir Estándar",
        optForPremium: "Optar por Premium",
        learnMore: "Saber Más",
        register: "Registrarse",
        login: "Iniciar Sesión",
        createAccount: "Crear Cuenta",
        saveChanges: "Guardar Cambios",
        cancel: "Cancelar",
        sendMessage: "Enviar Mensaje",
        explorePackages: "Explorar Paquetes",
        requestInfo: "Solicitar Información",
        startNow: "Comienza Ahora",
        contactSupport: "Contactar a Soporte",
        submit: "Enviar",
        next: "Siguiente",
        back: "Atrás",
    },

    roles: {
        owner: "Propietario",
        renter: "Inquilino",
        staff: "Staff de Hestia",
        admin: "Administrador",
        advisor: "Asesor Inmobiliario",
    },

    misc: {
        perMonth: "/mes",
        loading: "Cargando...",
        demoUser: "Usuario Demo",
        error: "Error",
    },

    pagination: {
        showing: (start: number, end: number, total: number) =>
            `Mostrando ${start} a ${end} de ${total} resultados`,
        rowsPerPage: "Filas por página",
        pageOf: (page: number, totalPages: number) =>
            `Página ${page} de ${totalPages}`,
        firstPage: "Primera página",
        previousPage: "Página anterior",
        nextPage: "Página siguiente",
        lastPage: "Última página",
    },
};
