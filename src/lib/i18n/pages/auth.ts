export const login = {
    title: "¡Bienvenido de Nuevo!",
    description: "Inicia sesión en tu cuenta de Hestia.",
    noAccount: "¿No tienes una cuenta?",
    registerLink: "Regístrate",
    emailLabel: "Correo Electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "••••••••",
    forgotPassword: "¿Olvidaste tu contraseña?",
    loginSuccess: "Inicio de Sesión Exitoso (Simulado)",
    welcomeBackUser: (email: string) => `¡Bienvenido de nuevo, ${email}! Redirigiendo...`,
};

export const register = {
    title: "Crea Tu Cuenta",
    description: "Únete a Hestia y asegura tu experiencia de arrendamiento.",
    hasAccount: "¿Ya tienes una cuenta?",
    loginLink: "Inicia sesión",
    fullName: "Nombre Completo",
    fullNamePlaceholder: "Juan Pérez",
    email: "Correo Electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    confirmPassword: "Confirmar Contraseña",
    role: "Soy un...",
    selectRole: "Soy un...",
    agreeToTermsPart1: "Acepto los ",
    agreeToTermsPart2: " y la ",
    agreeToTermsPart3: ".",
    terms: "Términos y Condiciones",
    privacy: "Política de Privacidad",
    registerSuccess: "Registro Exitoso (Simulado)",
    welcomeUser: (name: string) => `¡Bienvenido, ${name}! Por favor revisa tu correo para verificar tu cuenta.`,
    validation: {
        fullNameMin: "El nombre completo debe tener al menos 2 caracteres.",
        emailInvalid: "Dirección de correo electrónico inválida.",
        passwordMin: "La contraseña debe tener al menos 8 caracteres.",
        roleRequired: "Por favor selecciona un rol.",
        termsRequired: "Debes aceptar los términos y condiciones.",
        passwordsNoMatch: "Las contraseñas no coinciden.",
    },
    roleOptions: {
        tenant: "Inquilino",
        landlord: "Propietario",
        broker: "Asesor"
    }
};
