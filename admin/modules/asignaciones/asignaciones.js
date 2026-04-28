export function init() {
    console.log("Inicializando módulo Asignaciones...");

    // DOM Elements
    const btnAdd = document.getElementById('btn-add-asignacion');
    const modal = document.getElementById('modal-asignacion');
    const btnClose = document.getElementById('btn-close-modal-asignacion');
    const btnCancel = document.getElementById('btn-cancel-modal-asignacion');
    const form = document.getElementById('form-asignacion');
    const gridContainer = document.getElementById('asignaciones-grid');
    const stateContainer = document.getElementById('asignaciones-state-container');
    const modalAlert = document.getElementById('modal-alert-asignacion');

    // Form Fields
    const selectGrupo = document.getElementById('asignacion-grupo');
    const selectMateria = document.getElementById('asignacion-materia');
    const selectDocente = document.getElementById('asignacion-docente');
    const selectCelda = document.getElementById('asignacion-celda');
    const infoGrado = document.getElementById('grupo-grado-info');

    const supabase = window.supabaseClient;

    let localAsignaciones = [];
    let localGrupos = [];
    let localMaterias = [];
    let localDocentes = [];
    let localCeldas = [];

    // --- CARGA DE DATOS ---

    async function fetchData() {
        try {
            stateContainer.style.display = 'block';
            gridContainer.style.display = 'none';

            // 1. Cargar Grupos
            const { data: grupos } = await supabase.from('grupos').select('*').eq('activo', true).order('nombre');
            localGrupos = grupos || [];

            // 2. Cargar Materias
            const { data: materias } = await supabase.from('materias').select('*').eq('activo', true).order('nombre');
            localMaterias = materias || [];

            // 3. Cargar Docentes
            const { data: docentes } = await supabase.from('docentes').select('*').eq('activo', true).order('apellido');
            localDocentes = docentes || [];

            // 4. Cargar Celdas (Grilla)
            const { data: celdas } = await supabase.from('grilla_institucional').select('*').order('orden');
            localCeldas = celdas || [];

            // 5. Cargar Asignaciones Existentes
            const { data: asignaciones, error } = await supabase
                .from('asignaciones')
                .select(`
                    *,
                    grupos ( nombre, grado ),
                    materias ( nombre ),
                    docentes ( nombre, apellido ),
                    grilla_institucional ( dia, franja_horaria )
                `);

            if (error) throw error;
            localAsignaciones = asignaciones || [];

            populateInitialSelects();
            renderAsignaciones();

            stateContainer.style.display = 'none';
            gridContainer.style.display = 'grid';
        } catch (error) {
            console.error("Error cargando datos:", error);
            stateContainer.innerHTML = `<p style="color: var(--danger);">Error: ${error.message}</p>`;
        }
    }

    function populateInitialSelects() {
        // Poblamos Grupos
        selectGrupo.innerHTML = '<option value="" disabled selected>Seleccione un grupo</option>';
        localGrupos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = `${g.nombre} (${g.grado || 'S/G'})`;
            selectGrupo.appendChild(opt);
        });

        // Poblamos Docentes (todos inicialmente)
        selectDocente.innerHTML = '<option value="" disabled selected>Seleccione un docente</option>';
        localDocentes.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.apellido}, ${d.nombre}`;
            selectDocente.appendChild(opt);
        });

        // Poblamos Celdas
        selectCelda.innerHTML = '<option value="" disabled selected>Seleccione un horario</option>';
        localCeldas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.dia} - ${c.franja_horaria}`;
            selectCelda.appendChild(opt);
        });
    }

    // --- LÓGICA DE FILTRADO DINÁMICO ---

    selectGrupo.onchange = () => {
        const grupoId = selectGrupo.value;
        const grupo = localGrupos.find(g => g.id === grupoId);

        if (grupo) {
            infoGrado.textContent = `Grado detectado: ${grupo.grado || 'No definido'}`;
            
            // Filtrar materias por el grado del grupo
            const materiasFiltradas = localMaterias.filter(m => m.grado === grupo.grado);
            
            selectMateria.innerHTML = '<option value="" disabled selected>Seleccione una materia</option>';
            if (materiasFiltradas.length > 0) {
                materiasFiltradas.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = `${m.nombre} (${m.horas_semanales}h)`;
                    selectMateria.appendChild(opt);
                });
                selectMateria.disabled = false;
            } else {
                selectMateria.innerHTML = '<option value="" disabled selected>No hay materias para este grado</option>';
                selectMateria.disabled = true;
            }
        }
    };

    // --- RENDERIZADO ---

    function renderAsignaciones() {
        gridContainer.innerHTML = '';
        if (localAsignaciones.length === 0) {
            gridContainer.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">No hay asignaciones registradas.</p>';
            return;
        }

        localAsignaciones.forEach(asig => {
            const card = document.createElement('div');
            card.className = 'docente-card'; // Reutilizamos estilo
            card.innerHTML = `
                <div class="docente-info">
                    <h4 style="color: var(--primary);">${asig.grupos?.nombre || 'Grupo eliminado'}</h4>
                    <p><strong>${asig.materias?.nombre || 'Materia eliminada'}</strong></p>
                    <p style="font-size: 13px; margin-top: 5px;">
                        <i data-lucide="user" style="width:12px; height:12px;"></i> 
                        ${asig.docentes ? asig.docentes.apellido + ', ' + asig.docentes.nombre : 'Sin docente'}
                    </p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">
                        <i data-lucide="clock" style="width:12px; height:12px;"></i>
                        ${asig.grilla_institucional ? asig.grilla_institucional.dia + ' ' + asig.grilla_institucional.franja_horaria : 'Sin horario'}
                    </p>
                </div>
                <div class="docente-actions">
                    <button class="btn-card-action btn-delete-asig" data-id="${asig.id}" style="color: var(--danger);">
                        <i data-lucide="trash-2"></i> Eliminar
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
        attachDeleteEvents();
    }

    function attachDeleteEvents() {
        document.querySelectorAll('.btn-delete-asig').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('¿Está seguro de eliminar esta asignación?')) {
                    const { error } = await supabase.from('asignaciones').delete().eq('id', id);
                    if (!error) fetchData();
                }
            };
        });
    }

    // --- MODAL & FORM ---

    function openModal() {
        form.reset();
        selectMateria.disabled = true;
        infoGrado.textContent = '';
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    btnAdd.onclick = openModal;
    btnClose.onclick = closeModal;
    btnCancel.onclick = closeModal;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            grupo_id: selectGrupo.value,
            materia_id: selectMateria.value,
            docente_id: selectDocente.value,
            celda_id: parseInt(selectCelda.value)
        };

        try {
            const { error } = await supabase.from('asignaciones').insert([payload]);
            if (error) throw error;
            fetchData();
            closeModal();
        } catch (error) {
            alert("Error al guardar: " + error.message);
        }
    };

    fetchData();
}
