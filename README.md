# Energy School

> Plataforma de optimización energética escolar que monitorea en tiempo real el consumo eléctrico, envía alertas por desperdicio, permite control remoto de dispositivos y utiliza IA para aprender horarios y optimizar el uso de energía.

## 🚀 Tecnologías (Stack Tecnológico)

- **Frontend:** HTML5, CSS3 (Custom Properties para variables de tema oscuro y sustentabilidad), JavaScript Modular.
- **Backend:** Node.js, Express.
- **Base de Datos:** MongoDB (o PostgreSQL) para almacenamiento de métricas en tiempo real.
- **Inteligencia Artificial:** Python/TensorFlow (módulo `/src/ai`) para aprendizaje de hábitos y predicciones.
- **Diseño:** UI/UX Glossy, minimalista y de contraste neón.

## 📂 Estructura del Repositorio

\`\`\`text
.
├── /assets # Recursos estáticos
│ ├── /fonts # Fuentes tipográficas
│ ├── /icons # Iconografía (SVG, PNG)
│ └── /img # Imágenes generales
├── /docs # Documentación técnica, manuales y diagramas
├── /src # Código fuente principal
│ ├── /ai # Lógica de aprendizaje de hábitos y optimización
│ ├── /backend # API y lógica del servidor
│ │ ├── /controllers# Lógica de negocio (ej. control remoto)
│ │ ├── /models # Esquemas de datos
│ │ └── /routes # Definición de endpoints
│ ├── /database # Scripts de conexión y migraciones
│ └── /frontend # Interfaz de usuario (Dashboard)
├── /tests # Pruebas unitarias e integración
└── README.md # Documentación principal del proyecto
\`\`\`

## 🛠 Guía de Instalación

1.  **Clonar el repositorio:**
    \`\`\`bash
    git clone https://github.com/usuario/energy-school.git
    cd energy-school
    \`\`\`

2.  **Instalar dependencias del Backend:**
    \`\`\`bash
    cd src/backend
    npm install
    \`\`\`

3.  **Configurar Variables de Entorno:**
    - Crea un archivo \`.env\` en el directorio raíz del backend y añade tu \`DATABASE_URI\` y claves de APIs necesarias.

4.  **Ejecutar el servidor en desarrollo:**
    \`\`\`bash
    npm run dev
    \`\`\`

5.  **Ejecutar módulos de IA (si aplica):**
    \`\`\`bash
    cd ../ai
    pip install -r requirements.txt
    python main.py
    \`\`\`
6.  **Consideraciones Clave de Ingeniería y Arquitectura**

    Este proyecto está diseñado bajo una arquitectura dividida (Frontend / Backend / Hardware IoT). Para garantizar el correcto funcionamiento y la seguridad del sistema **Energy School**, se deben respetar los siguientes lineamientos:

    ### 6. Despliegue y Control de Versiones (Git & Netlify)
    - **Integración Continua (CI/CD):** El frontend está vinculado a Netlify. **No se deben subir cambios directamente a la rama `main` en producción si no han sido probados.** Netlify desplegará automáticamente cualquier _commit_ que se empuje a GitHub.
    - **Gestión de Archivos:** Las modificaciones en la estructura de carpetas (renombrado, eliminación) deben hacerse **estrictamente a través de la terminal usando los comandos de Git** (ej. `git mv` o `git rm -r`). Modificar carpetas rastreadas desde un gestor de archivos visual (como Thunar o el Explorador de Windows) y forzar un commit causará desincronización y errores de _pathspec_.
    - **Variables de Entorno:** Nunca, bajo ninguna circunstancia, se deben subir credenciales, tokens (como los _Personal Access Tokens_ de GitHub), o las claves secretas de base de datos (`service_role` key de Supabase) al repositorio público. Las claves públicas (ej. `anon_key` de Supabase) son seguras para el frontend.

    ### 2. Base de Datos y Autenticación (Supabase)
    - **Triggers y Funciones:** La lógica de creación de perfiles de usuario no reside en el frontend. Está delegada a nivel de base de datos mediante _Triggers_ y funciones SQL (ej. `handle_new_user()`) para garantizar la integridad de los datos.
    - **Seguridad de Filas (RLS):** Row Level Security (RLS) debe permanecer **habilitado** en la tabla `profiles` (y futuras tablas de sensores) para evitar accesos no autorizados mediante la API REST pública de Supabase.
    - **Límites de Desarrollo:** Durante la fase de desarrollo, la verificación por correo electrónico (Email Confirmation) debe permanecer desactivada en el panel de Auth de Supabase para evitar bloqueos por límite de tasa (_Rate Limiting_ / Error 500) del servidor SMTP interno. Para producción, es obligatorio configurar un proveedor SMTP externo (Resend, SendGrid, etc.).

    ### 3. Infraestructura IoT y Backend
    - **Protocolo de Comunicación:** Los microcontroladores de los salones (ESP32/ESP8266) **no deben** comunicarse directamente con Supabase mediante HTTP. Deben enviar su telemetría a través del protocolo **MQTT** hacia el Broker central.
    - **Seguridad Eléctrica (Actuadores):** Para cargas de alta potencia como aires acondicionados, es **obligatorio** el uso de contactores magnéticos. Los relés de 5V de los microcontroladores solo se utilizarán como etapa de control (aislamiento galvánico) para activar dichos contactores. Usar relés pequeños directamente en cargas altas representa riesgo de incendio.
    - **Contenedores (Docker):** El backend intermedio (Broker MQTT y el _script puente_ de Node.js/Python hacia Supabase) debe ejecutarse obligatoriamente dentro de un entorno Docker utilizando `docker-compose`. Esto garantiza la portabilidad del servidor entre ambientes de desarrollo y despliegues _on-premise_ en la institución.
