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
    let localDocenteMateria = []; // Nueva tabla de relaciones

    // --- CARGA DE DATOS ---

    async function fetchData() {
        try {
            stateContainer.style.display = 'block';
            gridContainer.style.display = 'none';

            // Carga en paralelo para mayor velocidad
            const [
                { data: grupos },
                { data: materias },
                { data: docentes },
                { data: celdas },
                { data: relDM }
            ] = await Promise.all([
                supabase.from('grupos').select('*').eq('activo', true).order('nombre'),
                supabase.from('materias').select('*').eq('activo', true).order('nombre'),
                supabase.from('docentes').select('*').eq('activo', true).order('apellido'),
                supabase.from('grilla_institucional').select('*').order('orden'),
                supabase.from('docente_materia').select('*')
            ]);

            localGrupos = grupos || [];
            localMaterias = materias || [];
            localDocentes = docentes || [];
            localCeldas = celdas || [];
            localDocenteMateria = relDM || [];

            // Cargar Asignaciones con Relaciones
            const { data: asignaciones, error } = await supabase
                .from('asignaciones')
                .select(`
                    *,
                    grupos ( nombre, grado ),
                    materias ( nombre, horas_semanales ),
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

        // Limpiar dependientes
        resetSelect(selectMateria, 'Primero seleccione un grupo');
        resetSelect(selectDocente, 'Primero seleccione una materia');
        resetSelect(selectCelda, 'Seleccione un horario');

        // Poblamos Celdas
        localCeldas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.dia} - ${c.franja_horaria}`;
            selectCelda.appendChild(opt);
        });
    }

    function resetSelect(element, text) {
        element.innerHTML = `<option value="" disabled selected>${text}</option>`;
        element.disabled = true;
    }

    // --- LÓGICA DE FILTRADO DINÁMICO EN CASCADA ---

    // 1. Al cambiar GRUPO -> Filtrar MATERIAS
    selectGrupo.onchange = () => {
        const grupoId = selectGrupo.value;
        const grupo = localGrupos.find(g => g.id === grupoId);

        resetSelect(selectMateria, 'Seleccione una materia');
        resetSelect(selectDocente, 'Primero seleccione una materia');

        if (grupo) {
            infoGrado.textContent = `Grado detectado: ${grupo.grado || 'No definido'}`;
            const materiasFiltradas = localMaterias.filter(m => m.grado === grupo.grado);
            
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
            }
        }
    };

    // 2. Al cambiar MATERIA -> Filtrar DOCENTES habilitados
    selectMateria.onchange = () => {
        const materiaId = selectMateria.value;
        resetSelect(selectDocente, 'Seleccione un docente');

        if (materiaId) {
            // Obtener IDs de docentes que pueden dar esta materia
            const docenteIdsHabilitados = localDocenteMateria
                .filter(rel => rel.materia_id === materiaId)
                .map(rel => rel.docente_id);

            const docentesFiltrados = localDocentes.filter(d => docenteIdsHabilitados.includes(d.id));

            if (docentesFiltrados.length > 0) {
                docentesFiltrados.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = `${d.apellido}, ${d.nombre}`;
                    selectDocente.appendChild(opt);
                });
                selectDocente.disabled = false;
            } else {
                selectDocente.innerHTML = '<option value="" disabled selected>No hay docentes habilitados</option>';
            }
        }
    };

    // --- RENDERIZADO PREMIUM ---

    function renderAsignaciones() {
        gridContainer.innerHTML = '';
        if (localAsignaciones.length === 0) {
            gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:50px; opacity:0.5;"><i data-lucide="info" style="width:40px; height:40px; margin-bottom:10px;"></i><p>No hay asignaciones registradas.</p></div>';
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        localAsignaciones.forEach(asig => {
            const card = document.createElement('div');
            card.className = 'asignacion-card';
            card.innerHTML = `
                <div class="asig-header">
                    <span class="asig-grupo-name">${asig.grupos?.nombre || 'G/E'}</span>
                    <button class="btn-delete-asig" data-id="${asig.id}" title="Eliminar">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                </div>
                <div class="asig-materia-name">${asig.materias?.nombre || 'M/E'}</div>
                <div class="asig-detail">
                    <i data-lucide="user"></i>
                    <span>${asig.docentes ? asig.docentes.apellido + ', ' + asig.docentes.nombre : 'Sin docente'}</span>
                </div>
                <div class="asig-badge-horario">
                    ${asig.grilla_institucional ? asig.grilla_institucional.dia + ' | ' + asig.grilla_institucional.franja_horaria : 'S/H'}
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
                if (confirm('¿Desea eliminar esta asignación horaria?')) {
                    try {
                        const { error } = await supabase.from('asignaciones').delete().eq('id', id);
                        if (error) throw error;
                        fetchData();
                    } catch (err) {
                        alert("Error al eliminar: " + err.message);
                    }
                }
            };
        });
    }

    // --- MODAL & FORM ---

    function openModal() {
        form.reset();
        infoGrado.textContent = '';
        populateInitialSelects();
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
        
        const grupo_id = selectGrupo.value;
        const materia_id = selectMateria.value;
        const docente_id = selectDocente.value;
        const celda_id = parseInt(selectCelda.value);

        // Validación de Conflictos Básica (Opcional pero útil)
        const conflictoDocente = localAsignaciones.find(a => a.docente_id === docente_id && a.celda_id === celda_id);
        if (conflictoDocente) {
            alert(`Conflicto: El docente ya tiene una clase asignada en este horario (${conflictoDocente.grupos.nombre}).`);
            return;
        }

        const conflictoGrupo = localAsignaciones.find(a => a.grupo_id === grupo_id && a.celda_id === celda_id);
        if (conflictoGrupo) {
            alert(`Conflicto: El grupo ya tiene otra materia asignada en este horario.`);
            return;
        }

        const payload = { grupo_id, materia_id, docente_id, celda_id };

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Procesando...';

            const { error } = await supabase.from('asignaciones').insert([payload]);
            if (error) throw error;
            
            fetchData();
            closeModal();
        } catch (error) {
            alert("Error al guardar: " + error.message);
        } finally {
            const btnSubmit = form.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar Asignación';
        }
    };

    fetchData();
}
