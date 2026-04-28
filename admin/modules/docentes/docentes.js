// modules/docentes/docentes.js

export function init() {
    console.log("Inicializando módulo Docentes...");

    // Inicializar variables del DOM del módulo
    const btnAdd = document.getElementById('btn-add-docente'); 
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

    // Cargar departamentos (materias) desde Supabase
    async function fetchDepartamentos() {
        try {
            const { data, error } = await supabase
                .from('materias')
                .select('nombre')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (error) throw error;

            const selectDep = document.getElementById('docente-departamento');
            // Limpiar opciones previas (manteniendo la primera)
            selectDep.innerHTML = '<option value="">Seleccione un departamento...</option>';

            if (data) {
                // Eliminar duplicados si existen (aunque por esquema el nombre es UNIQUE)
                const uniqueNames = [...new Set(data.map(m => m.nombre))];
                uniqueNames.forEach(nombre => {
                    const opt = document.createElement('option');
                    opt.value = nombre;
                    opt.textContent = nombre;
                    selectDep.appendChild(opt);
                });
            }
        } catch (error) {
            console.error("Error al cargar departamentos:", error);
        }
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
                    <p>${doc.departamento || 'Sin departamento'}</p>
                    <div style="margin-top:8px; font-size:12px; opacity:0.8;">
                        <span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">Grado ${doc.grado}</span>
                        ${doc.efectivo ? '<span style="background:rgba(16,185,129,0.1); color:#10B981; padding:2px 6px; border-radius:4px; margin-left:5px;">Efectivo</span>' : ''}
                    </div>
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
        modalAlert.classList.add('hidden');
        form.reset();
        
        if (docenteData) {
            document.getElementById('modal-title').innerText = 'Editar Docente';
            document.getElementById('docente-id').value = docenteData.id;
            document.getElementById('docente-nombre').value = docenteData.nombre;
            document.getElementById('docente-apellido').value = docenteData.apellido;
            document.getElementById('docente-departamento').value = docenteData.departamento || '';
            document.getElementById('docente-grado').value = docenteData.grado || 1;
            document.getElementById('docente-puntaje').value = docenteData.puntaje || 0;
            document.getElementById('docente-comentarios').value = docenteData.comentarios || '';
            document.getElementById('docente-efectivo').checked = docenteData.efectivo || false;
            document.getElementById('docente-activo').checked = docenteData.activo !== false;
        } else {
            document.getElementById('modal-title').innerText = 'Nuevo Docente';
            document.getElementById('docente-id').value = '';
            document.getElementById('docente-grado').value = 1;
            document.getElementById('docente-puntaje').value = 0;
            document.getElementById('docente-activo').checked = true;
        }

        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    if (btnAdd) btnAdd.onclick = () => openModal(null);
    btnClose.onclick = closeModal;
    btnCancel.onclick = closeModal;

    // Form Submit Handler (Crear / Editar)
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('docente-id').value;
        const nombre = document.getElementById('docente-nombre').value;
        const apellido = document.getElementById('docente-apellido').value;
        const departamento = document.getElementById('docente-departamento').value;
        const grado = parseInt(document.getElementById('docente-grado').value);
        const puntaje = parseFloat(document.getElementById('docente-puntaje').value);
        const comentarios = document.getElementById('docente-comentarios').value;
        const efectivo = document.getElementById('docente-efectivo').checked;
        const activo = document.getElementById('docente-activo').checked;

        const payload = { 
            nombre, 
            apellido, 
            departamento, 
            grado, 
            puntaje, 
            comentarios, 
            efectivo, 
            activo 
        };

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            let result;
            if (id) {
                // UPDATE
                result = await supabase
                    .from('docentes')
                    .update(payload)
                    .eq('id', id)
                    .select();
            } else {
                // INSERT
                result = await supabase
                    .from('docentes')
                    .insert([payload])
                    .select();
            }

            if (result.error) throw result.error;

            if (result.data && result.data.length > 0) {
                if (id) {
                    const index = localDocentes.findIndex(d => d.id === id);
                    if(index !== -1) localDocentes[index] = result.data[0];
                } else {
                    localDocentes.push(result.data[0]);
                }
                renderDocentes(localDocentes);
            }

            closeModal();
            
        } catch (error) {
            console.error("Error al guardar docente:", error);
            showModalAlert(error.message || "Error al guardar", "error");
        } finally {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar';
        }
    };

    // Delegación de eventos para los botones de las tarjetas
    function attachCardEvents() {
        const editBtns = document.querySelectorAll('.btn-edit');
        const toggleBtns = document.querySelectorAll('.btn-toggle');

        editBtns.forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const doc = localDocentes.find(d => d.id === id);
                if (doc) openModal(doc);
            };
        });

        toggleBtns.forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const docIndex = localDocentes.findIndex(d => d.id === id);
                
                if (docIndex !== -1) {
                    const currentDoc = localDocentes[docIndex];
                    const newStatus = !currentDoc.activo;
                    
                    try {
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
            };
        });
    }

    // Iniciar la carga
    fetchDepartamentos();
    fetchDocentes();
}
