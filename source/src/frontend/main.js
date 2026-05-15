/**
 * @file main.js
 * @description Script principal para manejar la interactividad general del frontend.
 * Propósito: Coordinar servicios de IoT, autenticación y animaciones.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Animaciones al hacer Scroll
    initScrollAnimations();
    
    // Configurar navegación dinámica según estado de sesión
    updateNavigation();
    
    // Cargar salones desde la base de datos
    loadSalones();
    
    // Iniciar monitoreo en tiempo real desde Supabase
    initRealTimeDashboard();

    // Iniciar simulación de consumo fantasma
    initGhostConsumptionSimulation();

    // Inicializar Modal de Creación de Salones
    initCreateRoomModal();
});

/**
 * @function loadSalones
 * @purpose Obtiene e inyecta los salones reales desde Supabase.
 */
async function loadSalones() {
    if (!window.iotService) return;
    
    const { data: salones } = await window.iotService.getSalones();
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (salones && salones.length > 0) {
        salones.forEach(salon => {
            const card = createSalonCard(salon);
            grid.appendChild(card);
        });
        initModalEvents(); // Inicializar eventos de los botones recién creados
        initScrollAnimations(); // Re-observar nuevas tarjetas
    } else {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No hay salones en la base de datos.</p>';
    }
}

/**
 * @function createSalonCard
 * @purpose Genera el HTML de una tarjeta de salón.
 */
function createSalonCard(salon) {
    const div = document.createElement('div');
    div.className = 'dashboard-card animate-on-scroll is-visible';
    div.dataset.id = salon.id;
    div.dataset.nombre = salon.nombre;
    div.dataset.estado = salon.estado_energia ? 'on' : 'off';
    
    const borderColor = salon.estado_energia ? 'var(--color-verde-neon)' : 'var(--color-naranja-vibrante)';
    div.style.borderColor = borderColor;
    
    div.innerHTML = `
        <h3>${salon.nombre}</h3>
        <p class="consumption-value" style="font-size: 2rem; font-weight: bold; color: ${borderColor};">${salon.consumo_actual.toFixed(3)} kWh</p>
        <p class="status-text">Estado: <span style="color: ${borderColor};">${salon.estado_energia ? 'Activo' : 'Apagado'}</span></p>
        <p style="font-size: 0.7rem; color: #888; font-family: monospace; margin-top: 0.5rem;" title="ID requerido para configuración IoT">ID: ${salon.id}</p>
        <div style="margin-top: 1rem;">
            <button class="${salon.estado_energia ? '' : 'btn-alert'}"><span></span>Controlar</button>
        </div>
    `;
    return div;
}

/**
 * @function initRealTimeDashboard
 * @purpose Se suscribe a cambios en la base de datos para actualizar el dashboard sin recargar.
 */
function initRealTimeDashboard() {
    if (window.iotService) {
        window.iotService.getRealTimeStats((payload) => {
            const { new: updatedSalon } = payload;
            updateSalonUI(updatedSalon);
        });
    }
}

/**
 * @function updateSalonUI
 * @purpose Actualiza los elementos visuales de un salón específico en el dashboard (Tiempo Real).
 */
function updateSalonUI(salon) {
    // Buscar la tarjeta usando el ID único en lugar del nombre
    const card = document.querySelector(`.dashboard-card[data-id="${salon.id}"]`);
    if (!card) return;
    
    const consumptionEl = card.querySelector('.consumption-value');
    const statusSpan = card.querySelector('.status-text span');
    const btn = card.querySelector('button');
    
    const borderColor = salon.estado_energia ? 'var(--color-verde-neon)' : 'var(--color-naranja-vibrante)';
    card.style.borderColor = borderColor;
    card.dataset.estado = salon.estado_energia ? 'on' : 'off';
    
    if (consumptionEl) {
        consumptionEl.innerText = `${salon.consumo_actual.toFixed(3)} kWh`;
        consumptionEl.style.color = borderColor;
    }
    
    if (statusSpan) {
        statusSpan.innerText = salon.estado_energia ? 'Activo' : 'Apagado';
        statusSpan.style.color = borderColor;
    }
    
    if (btn) {
        btn.className = salon.estado_energia ? '' : 'btn-alert';
    }
}

/**
 * @function initGhostConsumptionSimulation
 * @purpose Simula el consumo fantasma en los salones que están apagados.
 */
function initGhostConsumptionSimulation() {
    setInterval(() => {
        const cards = document.querySelectorAll('.dashboard-card');
        cards.forEach(card => {
            const statusSpan = card.querySelector('p:nth-of-type(2) span');
            const consumptionEl = card.querySelector('.consumption-value') || card.querySelector('p:nth-of-type(1)');
            
            if (statusSpan && consumptionEl) {
                const isOff = statusSpan.innerText.toLowerCase().includes('apagado') || card.dataset.estado === 'off';
                
                if (isOff) {
                    // Generar un pequeño consumo aleatorio entre 0.01 y 0.05
                    const ghostConsumption = (0.01 + Math.random() * 0.04).toFixed(3);
                    consumptionEl.innerText = `${ghostConsumption} kWh`;
                    consumptionEl.style.color = 'var(--color-amarillo)'; // Color de advertencia leve
                    
                    if (!statusSpan.innerText.includes('fantasma')) {
                        statusSpan.innerText = 'Dispositivos Apagados (Consumo Fantasma detectado)';
                        statusSpan.style.color = 'var(--color-amarillo)';
                    }
                }
            }
        });
    }, 3000); // Actualiza cada 3 segundos
}

/**
 * @function initModalEvents
 * @purpose Asigna los eventos de click a los botones de las tarjetas generadas dinámicamente.
 */
function initModalEvents() {
    const modal = document.getElementById('room-modal');
    const closeBtn = document.getElementById('close-modal');
    if (!modal || !closeBtn) return;

    const cards = document.querySelectorAll('.dashboard-card');
    
    // Remover eventos previos (si se vuelve a llamar)
    const oldBtnOn = document.getElementById('modal-btn-on');
    const oldBtnOff = document.getElementById('modal-btn-off');
    const newBtnOn = oldBtnOn.cloneNode(true);
    const newBtnOff = oldBtnOff.cloneNode(true);
    oldBtnOn.parentNode.replaceChild(newBtnOn, oldBtnOn);
    oldBtnOff.parentNode.replaceChild(newBtnOff, oldBtnOff);
    
    let currentSalonId = null;

    cards.forEach(card => {
        const btn = card.querySelector('button');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                currentSalonId = card.dataset.id;
                const title = card.dataset.nombre;
                const isOff = card.dataset.estado === 'off';
                const consumption = card.querySelector('.consumption-value').innerText;
                const statusColor = getComputedStyle(card).borderColor;

                // Actualizar Modal UI
                document.getElementById('modal-room-title').innerText = title;
                const consumoEl = document.getElementById('modal-consumption');
                consumoEl.innerText = consumption;
                consumoEl.style.color = statusColor;
                document.getElementById('modal-status').innerText = isOff ? 'Apagado' : 'Activo';
                
                // Lógica de inferencia
                let devices = "Luces LED, AC apagado";
                if (parseFloat(consumption) > 2) devices = "Luces, AC Activo, Proyector";
                if (parseFloat(consumption) < 0.1) devices = "Ninguno (Consumo fantasma)";
                document.getElementById('modal-devices').innerText = devices;

                modal.classList.add('active');
            });
        }
    });

    closeBtn.onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

    // Acciones Reales contra Supabase (Toggle)
    newBtnOff.addEventListener('click', async () => {
        if (!currentSalonId) return;
        newBtnOff.innerHTML = 'Apagando...';
        await window.iotService.toggleDevice(currentSalonId, false);
        newBtnOff.innerHTML = '<span></span>Apagar Todo';
        modal.classList.remove('active');
    });

    newBtnOn.addEventListener('click', async () => {
        if (!currentSalonId) return;
        newBtnOn.innerHTML = 'Encendiendo...';
        await window.iotService.toggleDevice(currentSalonId, true);
        newBtnOn.innerHTML = '<span></span>Encender Todo';
        modal.classList.remove('active');
    });
}

/**
 * @function initCreateRoomModal
 * @purpose Controla la apertura del modal y la creación de nuevos salones en BD.
 */
function initCreateRoomModal() {
    const modal = document.getElementById('create-room-modal');
    const btnOpen = document.getElementById('btn-open-create-modal');
    const btnClose = document.getElementById('close-create-modal');
    const btnCreate = document.getElementById('modal-btn-create');
    const inputName = document.getElementById('new-room-name');

    if (!modal || !btnOpen || !btnCreate) return;

    btnOpen.addEventListener('click', () => {
        inputName.value = ''; // Limpiar input
        modal.classList.add('active');
    });

    btnClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    btnCreate.addEventListener('click', async () => {
        const nombre = inputName.value.trim();
        if (!nombre) {
            alert('Por favor ingresa un nombre para el salón.');
            return;
        }

        btnCreate.innerHTML = 'Creando...';
        const { data, error } = await window.iotService.createSalon(nombre);
        btnCreate.innerHTML = '<span></span>Crear y Generar ID';

        if (error) {
            alert('Error al crear el salón: ' + error.message);
        } else {
            modal.classList.remove('active');
            // Recargar la lista de salones para mostrar el nuevo
            loadSalones();
        }
    });
}

/**
 * @function updateNavigation
 * @purpose Maneja la visibilidad de elementos del menú y el perfil de usuario.
 */
function updateNavigation() {
    const navLinksContainer = document.getElementById('dynamic-nav-links');
    if (!navLinksContainer) return;

    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const isLoginPage = window.location.pathname.includes('login.html');

    const commonLinks = `
        <a href="index.html">Inicio</a>
        <a href="control.html">Control Remoto</a>
        <a href="policies.html">Políticas</a>
        <a href="support.html">Soporte</a>
        <a href="contact.html">Contacto</a>
    `;

    if (isLoggedIn) {
        navLinksContainer.innerHTML = `
            ${commonLinks}
            <div class="user-menu-container">
                <button class="user-profile-btn" id="user-menu-btn">
                    <div class="user-avatar">A</div>
                    <small style="margin-left: 5px; opacity: 0.7;">▼</small>
                </button>
                <div class="user-dropdown" id="user-dropdown-menu">
                    <div class="dropdown-header">
                        <p style="margin-bottom: 0.2rem;">Sesión iniciada como</p>
                        <h5 style="margin: 0;" title="administrador_principal_proyecto_energy@energyschool.edu.mx">administrador_principal_proyecto_energy@energyschool.edu.mx</h5>
                        <span style="font-size: 0.75rem; color: var(--color-cian-electrico); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 5px;">Administrador IoT</span>
                    </div>
                    <a href="#">👤 Mi Perfil</a>
                    <a href="#">⚙️ Configuración</a>
                    <a href="#">🔌 Dispositivos</a>
                    <a href="#">👥 Usuarios y Accesos</a>
                    <button id="logout-btn" class="logout-link">Cerrar Sesión</button>
                </div>
            </div>
        `;

        const menuBtn = document.getElementById('user-menu-btn');
        const dropdownMenu = document.getElementById('user-dropdown-menu');

        if (menuBtn && dropdownMenu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.remove('active');
                }
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await window.authService.logout();
            });
        }
    } else {
        if (!isLoginPage) {
            navLinksContainer.innerHTML = `${commonLinks} <a href="login.html">Login</a>`;
        } else {
            navLinksContainer.innerHTML = commonLinks;
        }
    }
}

/**
 * @function initScrollAnimations
 * @purpose Animaciones de entrada al hacer scroll.
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
            else entry.target.classList.remove('is-visible');
        });
    }, { threshold: 0.15 });

    animatedElements.forEach(el => scrollObserver.observe(el));
}
