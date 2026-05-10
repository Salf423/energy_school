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
    
    // Iniciar monitoreo en tiempo real desde Supabase
    initRealTimeDashboard();

    // Iniciar simulación de consumo fantasma (para dispositivos apagados)
    initGhostConsumptionSimulation();

    // Inicializar Modal de Detalles/Control
    initModal();
});

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
 * @purpose Actualiza los elementos visuales de un salón específico en el dashboard.
 */
function updateSalonUI(salon) {
    // Buscar la tarjeta del salón por algún identificador (aquí usamos el nombre como ejemplo)
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText;
        if (title.includes(salon.nombre)) {
            if (consumptionEl) consumptionEl.innerText = `${salon.consumo_actual.toFixed(3)} kWh`;
            if (statusSpan) {
                statusSpan.innerText = salon.estado_energia ? 'Activo' : 'Apagado';
                statusSpan.style.color = salon.estado_energia ? 'var(--color-verde-neon)' : 'var(--color-naranja-vibrante)';
                
                // Actualizar atributos de datos para la simulación de consumo fantasma
                card.dataset.estado = salon.estado_energia ? 'on' : 'off';
            }
        }
    });
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
 * @function initModal
 * @purpose Inicializa la lógica del modal de control remoto y detalles.
 */
function initModal() {
    const modal = document.getElementById('room-modal');
    const closeBtn = document.getElementById('close-modal');
    if (!modal || !closeBtn) return;

    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach(card => {
        const btn = card.querySelector('button');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const title = card.querySelector('h3').innerText;
                const consumption = card.querySelector('p:nth-of-type(1)').innerText;
                const statusSpan = card.querySelector('p:nth-of-type(2) span') || card.querySelector('p:nth-of-type(2)');
                const statusText = statusSpan.innerText;
                const statusColor = getComputedStyle(card.querySelector('p:nth-of-type(1)')).color;

                // Actualizar Modal
                document.getElementById('modal-room-title').innerText = title;
                const consumoEl = document.getElementById('modal-consumption');
                consumoEl.innerText = consumption;
                consumoEl.style.color = statusColor;
                
                document.getElementById('modal-status').innerText = statusText;
                
                // Inferir dispositivos activos (Lógica de negocio simple)
                let devices = "Luces LED, AC apagado";
                if (parseFloat(consumption) > 2) devices = "Luces, AC Activo, Proyector";
                if (parseFloat(consumption) < 0.1) devices = "Ninguno (Consumo fantasma)";
                document.getElementById('modal-devices').innerText = devices;

                modal.classList.add('active');
            });
        }
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Control de dispositivos mediante iotService
    document.getElementById('modal-btn-off').addEventListener('click', async () => {
        const title = document.getElementById('modal-room-title').innerText;
        // En una app real, usaríamos el salonId real guardado en un data-attribute
        alert(`Enviando señal de APAGADO a ${title}...`);
        // await window.iotService.toggleDevice(salonId, false);
        modal.classList.remove('active');
    });

    document.getElementById('modal-btn-on').addEventListener('click', async () => {
        const title = document.getElementById('modal-room-title').innerText;
        alert(`Enviando señal de ENCENDIDO a ${title}...`);
        // await window.iotService.toggleDevice(salonId, true);
        modal.classList.remove('active');
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
                        <h5 style="margin: 0;">admin@energyschool.edu</h5>
                        <span style="font-size: 0.75rem; color: var(--color-cian-electrico); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-top: 5px;">Administrador</span>
                    </div>
                    <a href="#">Mi Perfil</a>
                    <a href="#">Configuración</a>
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
