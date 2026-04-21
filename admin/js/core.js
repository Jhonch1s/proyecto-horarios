// admin/js/core.js

// Verificar sesión y rol
(async function checkSession() {
    const dbClient = window.supabaseClient;
    const { data, error } = await dbClient.auth.getSession();
    
    if (error || !data.session) {
        window.location.href = '../index.html';
        return;
    }
    
    if (data.session.user.user_metadata?.role !== 'admin') {
        window.location.href = '../index.html';
    }
})();

// 1. Inicialización de íconos Lucide
lucide.createIcons();

// 2. Control del Sidebar
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// 3. Sistema de Enrutamiento SPA básico
const navLinks = document.querySelectorAll('.nav-item a[data-module]');
const moduleContainer = document.getElementById('module-container');
const currModuleTitle = document.getElementById('current-module-title');

// Objeto para llevar el rastro de módulos inicializados para no re-descargarlos a cada vuelta
const loadedModules = {};

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleName = link.getAttribute('data-module');
        const title = link.querySelector('span').innerText;
        
        // Actualizar UI de navegación
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currModuleTitle.innerText = title;

        loadModule(moduleName);
    });
});

/**
 * Función encargada de cargar dinámicamente un módulo.
 * NOTA: Para que el fetch funcione adecuadamente, el proyecto DEBE 
 * correr sobre un servidor local (Ej: Live Server en VSCode).
 */
async function loadModule(moduleName) {
    // Mostrar loader temporal
    moduleContainer.innerHTML = `
        <div class="module-loader" style="opacity: 1; transition: opacity 0.3s">
            <div class="admin-spinner"></div>
            <p>Cargando módulo ${moduleName}...</p>
        </div>
    `;

    try {
        // En un caso real, si es 'dashboard', cargaríamos dashboard.html
        // Para este proyecto estructuraremos los módulos dentro de la carpeta 'modules'
        let moduleUrl = `modules/${moduleName}/${moduleName}.html`;
        let jsUrl = `modules/${moduleName}/${moduleName}.js`;
        let cssUrl = `modules/${moduleName}/${moduleName}.css`;

        // Si es el módulo de inicio, podríamos tener un dashboard genérico. 
        if(moduleName === 'dashboard') {
            moduleContainer.innerHTML = `<div class="module-header"><h2>Bienvenido al panel</h2></div><p style="color:var(--text-muted)">Selecciona una opción del menú lateral.</p>`;
            return;
        }

        // 1. Cargar el HTML
        const response = await fetch(moduleUrl);
        if(!response.ok) throw new Error('No se encontró el archivo HTML del módulo.');
        const html = await response.text();
        
        // Inyectar HTML en el contenedor
        moduleContainer.innerHTML = html;

        // 2. Cargar CSS si no se ha cargado antes
        if (!document.getElementById(`css-${moduleName}`)) {
            const link = document.createElement('link');
            link.id = `css-${moduleName}`;
            link.rel = 'stylesheet';
            link.href = cssUrl;
            document.head.appendChild(link);
        }

        // 3. Re-iniciar los íconos para el nuevo HTML inyectado
        lucide.createIcons();

        // 4. Ejecutar JS del módulo
        // Usamos import() dinámico para que se evalúe como módulo aislado y se obtenga su función init()
        try {
            const moduleJS = await import(`../${jsUrl}`);
            if (moduleJS && typeof moduleJS.init === 'function') {
                moduleJS.init(); // Cada módulo debe exportar una función init()
            }
        } catch (jsErr) {
            console.warn(`El módulo ${moduleName} no tiene un JS válido o falló su inicialización:`, jsErr);
        }

    } catch (error) {
        console.error("Error al cargar el módulo:", error);
        moduleContainer.innerHTML = `
            <div style="text-align:center; padding: 40px;">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 20px;"></i>
                <h3 style="color: var(--danger)">Error al cargar el módulo</h3>
                <p style="color: var(--text-muted)">Verifica que estés usando Live Server o un servidor local. Detalles en consola.</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// Cargar dashboard por defecto al iniciar
loadModule('dashboard');
