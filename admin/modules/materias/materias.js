// modules/materias/materias.js

export function init() {
    console.log("Inicializando módulo Materias...");

    // Inicializar variables del DOM del módulo
    const btnAdd = document.getElementById('btn-add-materia');
    const modal = document.getElementById('modal-materia');
    const btnClose = document.getElementById('btn-close-modal-materia');
    const btnCancel = document.getElementById('btn-cancel-modal-materia');
    const form = document.getElementById('form-materia');
    const gridContainer = document.getElementById('materias-grid');
    const stateContainer = document.getElementById('materias-state-container');
    const modalAlert = document.getElementById('modal-alert-materia');

    // Cliente global de Supabase
    const supabase = window.supabaseClient;
    
    // Lista local de materias
    let localMaterias = [];

    // Función para mostrar alertas en el modal
    function showModalAlert(message, type = 'error') {
        modalAlert.textContent = message;
        modalAlert.className = `alert ${type}`;
        modalAlert.classList.remove('hidden');
        setTimeout(() => modalAlert.classList.add('hidden'), 5000);
    }

    // Cargar materias desde Supabase
    async function fetchMaterias() {
        try {
            stateContainer.style.display = 'block';
            gridContainer.style.display = 'none';

            const { data, error } = await supabase
                .from('materias')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            localMaterias = data || [];
            renderMaterias(localMaterias);
            
            stateContainer.style.display = 'none';
            gridContainer.style.display = 'grid';
        } catch (error) {
            console.error("Error al cargar materias:", error);
            stateContainer.innerHTML = `
                <div style="color: var(--danger); padding: 20px;">
                    <i data-lucide="alert-circle" style="width: 40px; height: 40px; margin-bottom: 10px;"></i>
                    <p>Error al cargar las materias: ${error.message}</p>
                    <button class="btn primary-btn" style="margin-top: 15px; width: auto;" onclick="location.reload()">Reintentar</button>
                </div>
            `;
            if(window.lucide) window.lucide.createIcons();
        }
    }

    // Renderizar listado de materias
    function renderMaterias(materias) {
        gridContainer.innerHTML = '';
        
        if(materias.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 15px;">
                    <p style="color:var(--text-muted)">No hay materias registradas aún.</p>
                </div>
            `;
            return;
        }

        materias.forEach(mat => {
            const card = document.createElement('div');
            card.className = `materia-card ${mat.activo === false ? 'inactive' : ''}`;
            card.innerHTML = `
                <div class="badge-status ${mat.activo === false ? 'inactive' : 'active'}">
                    ${mat.activo === false ? 'Oculto' : 'Activo'}
                </div>
                <div class="materia-card-header">
                    <div class="materia-icon">
                        <i data-lucide="book"></i>
                    </div>
                    <div class="materia-badge">${mat.grado || 'S/G'} | ${mat.horas_semanales} hrs</div>
                </div>
                <div class="materia-info">
                    <h4>${mat.nombre}</h4>
                    <p>ID: ${mat.id.substring(0, 8)}...</p>
                </div>
                <div class="materia-actions">
                    <button class="btn-card-action btn-edit-materia" data-id="${mat.id}" title="Editar">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-card-action btn-toggle-materia" data-id="${mat.id}" title="${mat.activo === false ? 'Mostrar' : 'Ocultar'}">
                        <i data-lucide="${mat.activo === false ? 'eye' : 'eye-off'}"></i>
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        if(window.lucide) window.lucide.createIcons();
        attachEvents();
    }

    // Delegación de eventos
    function attachEvents() {
        const editBtns = document.querySelectorAll('.btn-edit-materia');
        const toggleBtns = document.querySelectorAll('.btn-toggle-materia');

        editBtns.forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const mat = localMaterias.find(m => m.id === id);
                if (mat) openModal(mat);
            };
        });

        toggleBtns.forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                const matIndex = localMaterias.findIndex(m => m.id === id);
                if (matIndex !== -1) {
                    const mat = localMaterias[matIndex];
                    const newStatus = !(mat.activo !== false);
                    
                    try {
                        btn.disabled = true;
                        const { error } = await supabase
                            .from('materias')
                            .update({ activo: newStatus })
                            .eq('id', id);

                        if (error) throw error;

                        localMaterias[matIndex].activo = newStatus;
                        renderMaterias(localMaterias);
                    } catch (err) {
                        console.error("Error al cambiar estado:", err);
                        alert("Error al cambiar el estado: " + err.message);
                        btn.disabled = false;
                    }
                }
            };
        });
    }

    // Modal Handlers
    function openModal(materiaData = null) {
        modalAlert.classList.add('hidden');
        form.reset();
        
        if (materiaData) {
            document.getElementById('modal-title').innerText = 'Editar Asignatura';
            document.getElementById('materia-id').value = materiaData.id;
            document.getElementById('materia-nombre').value = materiaData.nombre;
            document.getElementById('materia-grado').value = materiaData.grado || '';
            document.getElementById('materia-carga').value = materiaData.horas_semanales;
            document.getElementById('materia-activo').checked = materiaData.activo !== false;
        } else {
            document.getElementById('modal-title').innerText = 'Nueva Asignatura';
            document.getElementById('materia-id').value = '';
            document.getElementById('materia-grado').value = '';
            document.getElementById('materia-activo').checked = true;
        }
        
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    btnAdd.onclick = () => openModal();
    btnClose.onclick = closeModal;
    btnCancel.onclick = closeModal;

    // Form Submit Handler (Crear / Editar)
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('materia-id').value;
        const nombre = document.getElementById('materia-nombre').value;
        const grado = document.getElementById('materia-grado').value;
        const horas_semanales = parseInt(document.getElementById('materia-carga').value);
        const activo = document.getElementById('materia-activo').checked;

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<div class="admin-spinner" style="width:18px; height:18px; border-width:2px;"></div>';

            const payload = { nombre, grado, horas_semanales, activo };

            let result;
            if (id) {
                // Editar
                result = await supabase
                    .from('materias')
                    .update(payload)
                    .eq('id', id)
                    .select();
            } else {
                // Crear
                result = await supabase
                    .from('materias')
                    .insert([payload])
                    .select();
            }

            if (result.error) throw result.error;

            if (result.data && result.data.length > 0) {
                if (id) {
                    const index = localMaterias.findIndex(m => m.id === id);
                    if (index !== -1) localMaterias[index] = result.data[0];
                } else {
                    localMaterias.push(result.data[0]);
                }
                renderMaterias(localMaterias);
            }

            closeModal();
            
        } catch (error) {
            console.error("Error al guardar materia:", error);
            showModalAlert(error.message || "Error al guardar la materia", "error");
        } finally {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar';
        }
    };

    // Iniciar la carga
    fetchMaterias();
}
