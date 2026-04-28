// modules/grupos/grupos.js

export function init() {
    console.log("Inicializando módulo Grupos...");

    // DOM Grupos
    const btnAddGrupo = document.getElementById('btn-add-grupo');
    const modalGrupo = document.getElementById('modal-grupo');
    const btnCloseGrupo = document.getElementById('btn-close-modal-grupo');
    const btnCancelGrupo = document.getElementById('btn-cancel-modal-grupo');
    const formGrupo = document.getElementById('form-grupo');
    const gridContainer = document.getElementById('grupos-grid');
    const stateContainer = document.getElementById('grupos-state-container');
    const modalAlertGrupo = document.getElementById('modal-alert-grupo');
    const cicloSelect = document.getElementById('grupo-ciclo');

    // DOM Ciclos
    const btnAddCiclo = document.getElementById('btn-add-ciclo');
    const modalCiclo = document.getElementById('modal-ciclo');
    const btnCloseCiclo = document.getElementById('btn-close-modal-ciclo');
    const btnCancelCiclo = document.getElementById('btn-cancel-modal-ciclo');
    const formCiclo = document.getElementById('form-ciclo');
    const modalAlertCiclo = document.getElementById('modal-alert-ciclo');
    
    // DOM Filtros
    const filterTurno = document.getElementById('filter-turno');
    const filterGrado = document.getElementById('filter-grado');
    const filterCiclo = document.getElementById('filter-ciclo');

    const supabase = window.supabaseClient;
    
    let localGrupos = [];
    let localCiclos = [];

    function showModalAlert(element, message, type = 'error') {
        element.textContent = message;
        element.className = `alert ${type}`;
        element.classList.remove('hidden');
        setTimeout(() => element.classList.add('hidden'), 5000);
    }

    // Cargar ciclos lectivos para el select
    async function fetchCiclos() {
        try {
            const { data, error } = await supabase
                .from('ciclos_lectivos')
                .select('*')
                .order('anio', { ascending: false });

            if (error) throw error;
            localCiclos = data || [];
            
            cicloSelect.innerHTML = '<option value="" disabled selected>Seleccione un ciclo</option>';
            filterCiclo.innerHTML = '<option value="all">Todos los años</option>';

            localCiclos.forEach(c => {
                // Para el modal
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.anio} - ${c.descripcion || ''}`;
                cicloSelect.appendChild(opt);

                // Para el filtro
                const optFilter = document.createElement('option');
                optFilter.value = c.id;
                optFilter.textContent = `${c.anio} ${c.descripcion ? '(' + c.descripcion + ')' : ''}`;
                filterCiclo.appendChild(optFilter);
            });
        } catch (error) {
            console.error("Error al cargar ciclos:", error);
            cicloSelect.innerHTML = '<option value="" disabled>Error al cargar ciclos</option>';
            filterCiclo.innerHTML = '<option value="all">Error al cargar</option>';
        }
    }

    // Aplicar filtros y ordenamiento
    function applyFilters() {
        let filtered = [...localGrupos];

        // 1. Filtrar por Turno
        const t = filterTurno.value;
        if (t !== 'all') {
            filtered = filtered.filter(g => g.turno === t);
        }

        // 1.5 Filtrar por Grado
        const gr = filterGrado.value;
        if (gr !== 'all') {
            filtered = filtered.filter(g => g.grado === gr);
        }

        // 2. Filtrar por Ciclo
        const c = filterCiclo.value;
        if (c !== 'all') {
            filtered = filtered.filter(g => g.ciclo_lectivo_id == c);
        }

        // 3. Ordenamiento Alfanumérico (7°, 8°, 1° EMS...)
        filtered.sort((a, b) => {
            return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' });
        });

        renderGrupos(filtered);
    }

    // Cargar grupos
    async function fetchGrupos() {
        try {
            stateContainer.style.display = 'block';
            gridContainer.style.display = 'none';

            const { data, error } = await supabase
                .from('grupos')
                .select(`
                    *,
                    ciclos_lectivos ( anio, descripcion )
                `)
                .order('nombre', { ascending: true });

            if (error) throw error;

            localGrupos = data || [];
            
            // Poblamos el filtro de grados dinámicamente antes de aplicar filtros
            populateGradoFilter(localGrupos);
            
            applyFilters();
            
            stateContainer.style.display = 'none';
            gridContainer.style.display = 'grid';
        } catch (error) {
            console.error("Error al cargar grupos:", error);
            stateContainer.innerHTML = `<p style="color: var(--danger);">Error al cargar grupos: ${error.message}</p>`;
        }
    }

    // Función para poblar el filtro de grados con valores reales de la DB
    function populateGradoFilter(grupos) {
        const filterGrado = document.getElementById('filter-grado');
        if (!filterGrado) return;

        // Extraer grados únicos y filtrar nulos
        const gradosUnicos = [...new Set(grupos.map(g => g.grado).filter(grado => grado))];
        
        // Ordenarlos alfanuméricamente
        gradosUnicos.sort();

        // Guardar el valor seleccionado actualmente para no perderlo si re-poblamos
        const currentValue = filterGrado.value;

        filterGrado.innerHTML = '<option value="all">Todos los grados</option>';
        gradosUnicos.forEach(grado => {
            const opt = document.createElement('option');
            opt.value = grado;
            opt.textContent = grado;
            filterGrado.appendChild(opt);
        });

        // Restaurar valor si existía
        if (currentValue && gradosUnicos.includes(currentValue)) {
            filterGrado.value = currentValue;
        }
    }

    function renderGrupos(grupos) {
        gridContainer.innerHTML = '';
        
        if(grupos.length === 0) {
            gridContainer.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1;">No hay grupos registrados.</p>`;
            return;
        }

        grupos.forEach(g => {
            const card = document.createElement('div');
            card.className = `grupo-card ${g.activo ? '' : 'inactive'}`;
            card.innerHTML = `
                <div class="turno-badge ${g.turno === 'matutino' ? 'turno-matutino' : 'turno-vespertino'}">
                    ${g.turno}
                </div>
                <div class="grupo-icon">
                    <i data-lucide="layers"></i>
                </div>
                <div class="grupo-info">
                    <h4>${g.nombre}</h4>
                    <div class="ciclo-label">
                        <i data-lucide="calendar" style="width:14px; height:14px;"></i>
                        <span>${g.ciclos_lectivos ? g.ciclos_lectivos.anio : 'Sin ciclo'} | ${g.grado || 'S/G'}</span>
                    </div>
                </div>
                <div class="docente-actions">
                    <button class="btn-card-action btn-edit-grupo" data-id="${g.id}">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button class="btn-card-action btn-toggle-grupo" data-id="${g.id}">
                        <i data-lucide="${g.activo ? 'eye-off' : 'eye'}"></i>
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        if(window.lucide) window.lucide.createIcons();
        attachEvents();
    }

    function attachEvents() {
        const editBtns = document.querySelectorAll('.btn-edit-grupo');
        const toggleBtns = document.querySelectorAll('.btn-toggle-grupo');

        editBtns.forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const g = localGrupos.find(x => x.id === id);
                if (g) openModalGrupo(g);
            };
        });

        toggleBtns.forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                const gIndex = localGrupos.findIndex(x => x.id === id);
                if (gIndex !== -1) {
                    const newStatus = !localGrupos[gIndex].activo;
                    try {
                        btn.disabled = true;
                        const { error } = await supabase
                            .from('grupos')
                            .update({ activo: newStatus })
                            .eq('id', id);
                        if (error) throw error;
                        localGrupos[gIndex].activo = newStatus;
                        renderGrupos(localGrupos);
                    } catch (err) {
                        alert("Error: " + err.message);
                        btn.disabled = false;
                    }
                }
            };
        });
    }

    // Modal Grupos Handlers
    function openModalGrupo(data = null) {
        modalAlertGrupo.classList.add('hidden');
        formGrupo.reset();
        
        if (data) {
            document.getElementById('modal-title-grupo').innerText = 'Editar Grupo';
            document.getElementById('grupo-id').value = data.id;
            document.getElementById('grupo-nombre').value = data.nombre;
            document.getElementById('grupo-grado').value = data.grado || '';
            document.getElementById('grupo-turno').value = data.turno;
            document.getElementById('grupo-ciclo').value = data.ciclo_lectivo_id;
            document.getElementById('grupo-activo').checked = data.activo;
        } else {
            document.getElementById('modal-title-grupo').innerText = 'Nuevo Grupo';
            document.getElementById('grupo-id').value = '';
            document.getElementById('grupo-activo').checked = true;
        }
        modalGrupo.classList.remove('hidden');
        
        // Desplazar al inicio del contenedor y dar foco al primer campo
        const container = document.getElementById('module-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
            document.getElementById('grupo-nombre').focus();
        }, 100);
    }

    function closeModalGrupo() {
        modalGrupo.classList.add('hidden');
    }

    btnAddGrupo.onclick = () => openModalGrupo();
    btnCloseGrupo.onclick = closeModalGrupo;
    btnCancelGrupo.onclick = closeModalGrupo;

    formGrupo.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('grupo-id').value;
        const nombre = document.getElementById('grupo-nombre').value;
        const grado = document.getElementById('grupo-grado').value;
        const turno = document.getElementById('grupo-turno').value;
        const ciclo_lectivo_id = parseInt(document.getElementById('grupo-ciclo').value);
        const activo = document.getElementById('grupo-activo').checked;

        const payload = { nombre, grado, turno, ciclo_lectivo_id, activo };

        try {
            const btnSubmit = formGrupo.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            let result;
            if (id) {
                result = await supabase
                    .from('grupos')
                    .update(payload)
                    .eq('id', id)
                    .select('*, ciclos_lectivos(anio, descripcion)');
            } else {
                result = await supabase
                    .from('grupos')
                    .insert([payload])
                    .select('*, ciclos_lectivos(anio, descripcion)');
            }

            if (result.error) throw result.error;
            if (result.data && result.data.length > 0) {
                if (id) {
                    const idx = localGrupos.findIndex(x => x.id === id);
                    if (idx !== -1) localGrupos[idx] = result.data[0];
                } else {
                    localGrupos.push(result.data[0]);
                }
                renderGrupos(localGrupos);
            }
            closeModalGrupo();
        } catch (err) {
            showModalAlert(modalAlertGrupo, err.message, "error");
        } finally {
            const btnSubmit = formGrupo.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar';
        }
    };

    // Modal Ciclos Handlers
    function openModalCiclo() {
        modalAlertCiclo.classList.add('hidden');
        formCiclo.reset();
        modalCiclo.classList.remove('hidden');

        // Desplazar al inicio del contenedor y dar foco
        const container = document.getElementById('module-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            document.getElementById('ciclo-anio').focus();
        }, 100);
    }

    function closeModalCiclo() {
        modalCiclo.classList.add('hidden');
    }

    btnAddCiclo.onclick = openModalCiclo;
    btnCloseCiclo.onclick = closeModalCiclo;
    btnCancelCiclo.onclick = closeModalCiclo;

    formCiclo.onsubmit = async (e) => {
        e.preventDefault();
        const anio = parseInt(document.getElementById('ciclo-anio').value);
        const descripcion = document.getElementById('ciclo-descripcion').value;
        const activo = document.getElementById('ciclo-activo').checked;

        try {
            const btnSubmit = formCiclo.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Guardando...';

            const { data, error } = await supabase
                .from('ciclos_lectivos')
                .insert([{ anio, descripcion, activo }])
                .select();

            if (error) throw error;

            await fetchCiclos(); // Recargar el select de grupos
            closeModalCiclo();
            alert("Ciclo lectivo creado con éxito.");
        } catch (err) {
            console.error(err);
            showModalAlert(modalAlertCiclo, err.message || "Error al crear ciclo (puede que el año ya exista)", "error");
        } finally {
            const btnSubmit = formCiclo.querySelector('button[type="submit"]');
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar Ciclo';
        }
    };

    // Eventos de filtros
    filterTurno.onchange = applyFilters;
    filterGrado.onchange = applyFilters;
    filterCiclo.onchange = applyFilters;

    fetchCiclos();
    fetchGrupos();
}
