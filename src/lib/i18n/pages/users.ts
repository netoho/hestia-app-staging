export const users = {
    title: "Gestión de Usuarios",
    subtitle: "Administra todos los usuarios del sistema.",
    cardTitle: "Todos los Usuarios",
    cardDescription: (count: number) => `Hay ${count} usuarios registrados.`,
    newUser: "Crear Usuario",
    tableHeaders: {
        name: "Nombre",
        email: "Correo Electrónico",
        role: "Rol",
        createdAt: "Fecha de Registro",
        actions: "Acciones",
    },
    actions: {
        label: "Acciones",
        edit: "Editar Usuario",
        delete: "Desactivar Usuario",
    },
    noUsersFound: "No se encontraron usuarios.",
    errorLoading: "Error al cargar los usuarios.",
    roleLabels: {
        admin: "Administrador",
        staff: "Staff",
        owner: "Propietario",
        renter: "Inquilino",
    } as Record<string, string>,
};
