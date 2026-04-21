// docente/js/core.js

// Verificar sesión
(async function checkSession() {
    const dbClient = window.supabaseClient;
    const { data, error } = await dbClient.auth.getSession();
    
    if (error || !data.session) {
        window.location.href = '../index.html';
    }
})();

lucide.createIcons();

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

const navLinks = document.querySelectorAll('.nav-item a[data-module]');
const moduleContainer = document.getElementById('module-container');
const currModuleTitle = document.getElementById('current-module-title');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleName = link.getAttribute('data-module');
        const title = link.querySelector('span').innerText;
        
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currModuleTitle.innerText = title;

        loadModule(moduleName);
    });
});

async function loadModule(moduleName) {
    moduleContainer.innerHTML = `
        <div class="module-loader" style="opacity: 1; transition: opacity 0.3s">
            <div class="admin-spinner" style="border-left-color: #10B981;"></div>
            <p>Cargando módulo ${moduleName}...</p>
        </div>
    `;

    try {
        if(moduleName === 'dashboard') {
            moduleContainer.innerHTML = `
                <div class="module-header">
                    <h2>Bienvenido Profesor</h2>
                    <p style="color:var(--text-muted)">Utiliza el menú para consultar tus grupos y horarios de clase.</p>
                </div>
            `;
            return;
        }

        let moduleUrl = `modules/${moduleName}/${moduleName}.html`;
        let jsUrl = `modules/${moduleName}/${moduleName}.js`;
        
        const response = await fetch(moduleUrl);
        if(!response.ok) throw new Error('Módulo no encontrado');
        const html = await response.text();
        
        moduleContainer.innerHTML = html;
        lucide.createIcons();

        try {
            const moduleJS = await import(`../${jsUrl}`);
            if (moduleJS && typeof moduleJS.init === 'function') {
                moduleJS.init();
            }
        } catch (jsErr) {
            console.warn(`El módulo ${moduleName} falló su JS:`, jsErr);
        }

    } catch (error) {
        console.error(error);
        moduleContainer.innerHTML = `
            <div style="text-align:center; padding: 40px;">
                <i data-lucide="wifi-off" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-main)">Error de red / CORS</h3>
                <p style="color: var(--text-muted)">Asegúrate de ejecutar el servidor local (Live Server).</p>
            </div>
        `;
        lucide.createIcons();
    }
}

loadModule('dashboard');
