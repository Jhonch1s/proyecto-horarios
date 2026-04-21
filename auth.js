// ===== CONFIGURACIÓN DE SUPABASE =====
// La configuración fue movida a config.js
// El cliente está disponible en window.supabaseClient
const dbClient = window.supabaseClient;

// ===== ELEMENTOS DEL DOM =====
const loginContainerDiv = document.getElementById('login-container');
const registerContainerDiv = document.getElementById('register-container');
const btnShowRegister = document.getElementById('show-register');
const btnShowLogin = document.getElementById('show-login');

// Formularios
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Botones y alertas
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const loginAlert = document.getElementById('login-alert');
const registerAlert = document.getElementById('register-alert');

// ===== LÓGICA DE LA INTERFAZ =====
// Alternar vistas
btnShowRegister.addEventListener('click', () => {
    loginContainerDiv.classList.add('hidden-form');
    // Pequeño timeout para fluidez en la animación
    setTimeout(() => {
        registerContainerDiv.classList.remove('hidden-form');
    }, 200);
});

btnShowLogin.addEventListener('click', () => {
    registerContainerDiv.classList.add('hidden-form');
    setTimeout(() => {
        loginContainerDiv.classList.remove('hidden-form');
    }, 200);
});

// Utilidad para mostrar alertas
function showAlert(element, message, type = 'error') {
    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
    
    // Ocultar alerta después de 5 segundos
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

// Alternar estado de carga en botones
function setLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// ===== LÓGICA DE AUTENTICACIÓN =====

// 1. Iniciar sesión
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    setLoading(btnLogin, true);
    
    try {
        const { data, error } = await dbClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        // Verificar si es un admin o un docente
        const role = data.user.user_metadata?.role || 'docente';
        const is_admin = role === 'admin';
        
        showAlert(loginAlert, `¡Bienvenido! Iniciaste sesión correctamente. Redirigiendo...`, 'success');
        
        // Redirigir al dashboard correspondiente
        setTimeout(() => {
            if (is_admin) { 
                window.location.href = 'admin/admin.html'; 
            } else { 
                window.location.href = 'docente/docente.html'; 
            }
        }, 1000);

    } catch (error) {
        let msg = "Error al iniciar sesión. Verifica tus credenciales.";
        // Pequeña validación si la key era inválida
        if(error.message.includes("JWT")) msg = "Error con la API Key configurada. Verifica que sea la 'anon public' key de Supabase.";
        
        showAlert(loginAlert, error.message || msg, 'error');
    } finally {
        setLoading(btnLogin, false);
    }
});

// 2. Registrarse
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    setLoading(btnRegister, true);
    
    try {
        const { data, error } = await dbClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: 'docente' // Por defecto, asignamos a los registros públicos como docentes
                }
            }
        });
        
        if (error) throw error;
        
        // El registro fue exitoso. Dependiendo de los settings de proyecto, puede requerir confirmación por correo.
        if (data?.user?.identities?.length === 0) {
            showAlert(registerAlert, "Este correo ya está registrado.", "error");
            return;
        }

        showAlert(registerAlert, "¡Registro exitoso! Por favor inicia sesión.", "success");
        registerForm.reset();
        
        // Pasamos al usuario al formulario de login tras 2 segs
        setTimeout(() => {
            btnShowLogin.click();
        }, 2000);

    } catch (error) {
        showAlert(registerAlert, error.message || "Error al crear tu cuenta. Intenta de nuevo.", 'error');
    } finally {
        setLoading(btnRegister, false);
    }
});
