export const onboard = {
    loading: "Validando invitación...",
    invalidInvitation: {
        title: "Invitación Inválida",
        description: "Este enlace de invitación puede haber expirado o ya ha sido usado.",
        contact: "Por favor contacta a tu administrador para obtener una nueva invitación.",
        goToLogin: "Ir al Login"
    },
    welcome: {
        title: "¡Bienvenido a Hestia!",
        subtitle: "Completa tu información para comenzar"
    },
    accountInfo: {
        title: "Datos de cuenta:",
        permissions: "Permisos:",
        userFallback: "Usuario"
    },
    avatar: {
        label: "Avatar (Opcional)",
        maxSize: "Tamaño máx: 15MB. Formatos: JPG, PNG, WebP"
    },
    form: {
        password: {
            label: "Contraseña",
            placeholder: "Ingresa tu contraseña",
            minLength: "Mínimo 6 caracteres"
        },
        confirmPassword: {
            label: "Confirmar Contraseña",
            placeholder: "Confirma tu contraseña"
        },
        phone: {
            label: "Teléfono",
            placeholder: "Tu número de teléfono"
        },
        address: {
            label: "Dirección",
            placeholder: "Tu dirección"
        }
    },
    submit: {
        submitting: "Configurando tu cuenta...",
        complete: "Completar Configuración"
    },
    toast: {
        fileTooLarge: {
            title: "Archivo muy grande",
            description: "Por favor selecciona una imagen menor a 15MB"
        },
        invalidFileType: {
            title: "Tipo de archivo inválido",
            description: "Por favor selecciona un archivo de imagen"
        },
        success: {
            title: "¡Bienvenido a Hestia!",
            description: "Tu cuenta ha sido configurada exitosamente."
        }
    },
    validation: {
        passwordMismatch: "Las contraseñas no coinciden",
        passwordMinLength: "La contraseña debe tener al menos 6 caracteres"
    },
    errors: {
        tokenRequired: "El token es requerido",
        invalidToken: "Token de invitación inválido o expirado",
        alreadyUsed: "Esta invitación ya ha sido usada",
        validationFailed: "Error al validar la invitación",
        setupFailed: "Error al completar la configuración de cuenta",
        invalidInput: "Entrada inválida",
        generic: "Ocurrió un error"
    }
};
