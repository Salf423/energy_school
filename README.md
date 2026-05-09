# Energy School

> Plataforma de optimización energética escolar que monitorea en tiempo real el consumo eléctrico, envía alertas por desperdicio, permite control remoto de dispositivos y utiliza IA para aprender horarios y optimizar el uso de energía.

## 🚀 Tecnologías (Stack Tecnológico)

*   **Frontend:** HTML5, CSS3 (Custom Properties para variables de tema oscuro y sustentabilidad), JavaScript Modular.
*   **Backend:** Node.js, Express.
*   **Base de Datos:** MongoDB (o PostgreSQL) para almacenamiento de métricas en tiempo real.
*   **Inteligencia Artificial:** Python/TensorFlow (módulo `/src/ai`) para aprendizaje de hábitos y predicciones.
*   **Diseño:** UI/UX Glossy, minimalista y de contraste neón.

## 📂 Estructura del Repositorio

\`\`\`text
.
├── /assets             # Recursos estáticos
│   ├── /fonts          # Fuentes tipográficas
│   ├── /icons          # Iconografía (SVG, PNG)
│   └── /img            # Imágenes generales
├── /docs               # Documentación técnica, manuales y diagramas
├── /src                # Código fuente principal
│   ├── /ai             # Lógica de aprendizaje de hábitos y optimización
│   ├── /backend        # API y lógica del servidor
│   │   ├── /controllers# Lógica de negocio (ej. control remoto)
│   │   ├── /models     # Esquemas de datos
│   │   └── /routes     # Definición de endpoints
│   ├── /database       # Scripts de conexión y migraciones
│   └── /frontend       # Interfaz de usuario (Dashboard)
├── /tests              # Pruebas unitarias e integración
└── README.md           # Documentación principal del proyecto
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
    *   Crea un archivo \`.env\` en el directorio raíz del backend y añade tu \`DATABASE_URI\` y claves de APIs necesarias.

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
