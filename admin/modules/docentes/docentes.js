// modules/docentes/docentes.js

export function init() {
    console.log("Inicializando módulo Docentes...");

    // Inicializar variables del DOM del módulo
    const btnAdd = document.getElementById('btn-add-docente'); // Este botón ahora está oculto
    const modal = document.getElementById('modal-docente');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const form = document.getElementById('form-docente');
    const gridContainer = document.getElementById('docentes-grid');
    const stateContainer = document.getElementById('docentes-state-container');
    const modalAlert = document.getElementById('modal-alert');

    // Cliente global de Supabase
    const supabase = window.supabaseClient;
    
    // Lista local de docentes obtenidos
    let localDocentes = [];

    // Función para mostrar alertas en el modal
    function showModalAlert(message, type = 'error') {
        modalAlert.textContent = message;
        modalAlert.className = `alert ${type}`;
        modalAlert.classList.remove('hidden');
        setTimeout(() => modalAlert.classList.add('hidden'), 5000);
    }

    // Cargar docentes desde Supabase
    async function fetchDocentes() {
        try {
            stateContainer.style.display = 'block';
            gridContainer.style.display = 'none';

            const { data, error } = await supabase
                .from('docentes')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            localDocentes = data || [];
            renderDocentes(localDocentes);
            
            stateContainer.style.display = 'none';
            gridContainer.style.display = 'grid';
        } catch (error) {
            console.error("Error al cargar docentes:", error);
            stateContainer.innerHTML = `<p style="color: var(--danger);">Error al cargar los docentes: ${error.message}</p>`;
        }
    }

    // Renderizar listado de docentes
    function renderDocentes(docentes) {
        gridContainer.innerHTML = '';
        
        if(docentes.length === 0) {
            gridContainer.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1;">No hay docentes registrados.</p>`;
            return;
        }

        docentes.forEach(doc => {
            const card = document.createElement('div');
            card.className = `docente-card ${doc.activo ? '' : 'inactive'}`;
            card.innerHTML = `
                <div class="badge-status ${doc.activo ? 'active' : 'inactive'}">
                    ${doc.activo ? 'Activo' : 'Oculto'}
                </div>
                <div class="docente-card-header">
                    <div class="docente-avatar">
                        <i data-lucide="user"></i>
                    </div>
                </div>
                <div class="docente-info">
                    <h4>${doc.nombre} ${doc.apellido}</h4>
                    <p>${doc.departamento || 'Sin departamento asignado'}</p>
                </div>
                <div class="docente-actions">
                    <button class="btn-card-action btn-edit" data-id="${doc.id}">
                        <i data-lucide="edit-2"></i> Editar
                    </button>
                    <button class="btn-card-action btn-toggle" data-id="${doc.id}">
                        <i data-lucide="${doc.activo ? 'eye-off' : 'eye'}"></i> 
                        ${doc.activo ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        // Re-injectar íconos creados dinámicamente
        if(window.lucide) window.lucide.createIcons();

        // Asignar eventos de editar y ocultar a las tarjetas nuevas
        attachCardEvents();
    }

    // Modal Handlers
    function openModal(docenteData = null) {
        document.getElementById('modal-title').innerText = 'Editar Docente';
        document.getElementById('form-docente').reset();
        document.getElementById('modal-alert').classList.add('hidden');
        
        if (docenteData) {
            document.getElementById('docente-id').value = docenteData.id;
            document.getElementById('docente-nombre').value = docenteData.nombre;
            document.getElementById('docente-apellido').value = docenteData.apellido;
            document.getElementById('docente-departamento').value = docenteData.departamento || '';
            document.getElementById('docente-activo').checked = docenteData.activo;
        }

        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    if (btnAdd) btnAdd.addEventListener('click', () => openModal(null)); // Por ahora oculto
    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);

    // Form Submit Handler (Editar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('docente-id').value;
        const nombre = document.getElementById('docente-nombre').value;
        const apellido = document.getElementById('docente-apellido').value;
        const departamento = document.getElementById('docente-departamento').value;
        const activo = document.getElementById('docente-activo').checked;

        if (!id) {
            showModalAlert("Operación no permitida: Creación de docentes deshabilitada.", "error");
            return;
        }

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            const { data, error } = await supabase
                .from('docentes')
                .update({ nombre, apellido, departamento, activo })
                .eq('id', id)
                .select();

            if (error) throw error;

            // Actualizar arreglo local
            const index = localDocentes.findIndex(d => d.id === id);
            if(index !== -1 && data && data.length > 0) {
                localDocentes[index] = data[0];
            }

            renderDocentes(localDocentes);
            closeModal();
            
        } catch (error) {
            console.error("Error al actualizar docente:", error);
            showModalAlert(error.message || "Error al actualizar", "error");
        } finally {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar';
        }
    });

    // Delegación de eventos para los botones de las tarjetas
    function attachCardEvents() {
        const editBtns = document.querySelectorAll('.btn-edit');
        const toggleBtns = document.querySelectorAll('.btn-toggle');

        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const doc = localDocentes.find(d => d.id === id);
                if (doc) openModal(doc);
            });
        });

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const docIndex = localDocentes.findIndex(d => d.id === id);
                
                if (docIndex !== -1) {
                    const currentDoc = localDocentes[docIndex];
                    const newStatus = !currentDoc.activo;
                    
                    try {
                        // Optimistic UI update
                        e.currentTarget.disabled = true;
                        
                        const { error } = await supabase
                            .from('docentes')
                            .update({ activo: newStatus })
                            .eq('id', id);

                        if (error) throw error;

                        localDocentes[docIndex].activo = newStatus;
                        renderDocentes(localDocentes);
                        
                    } catch (error) {
                        console.error("Error al cambiar estado:", error);
                        alert("Error al cambiar el estado del docente.");
                        e.currentTarget.disabled = false;
                    }
                }
            });
        });
    }

    // Iniciar la carga
    fetchDocentes();
}
