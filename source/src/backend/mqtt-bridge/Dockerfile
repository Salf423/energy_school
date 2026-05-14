# =============================================================
# Energy School — Dockerfile (MQTT Bridge para Render)
# =============================================================
# Imagen ligera basada en Alpine, optimizada para el tier
# gratuito de Render (512 MB RAM).
#
# Render detecta el Dockerfile automáticamente y lo construye.
# El puerto se inyecta vía la variable de entorno PORT.
# =============================================================

# ── Etapa 1: Instalar dependencias ──
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copiar solo manifiestos para aprovechar caché de Docker.
# Si package.json no cambia, npm install no se re-ejecuta.
COPY package.json package-lock.json* ./

RUN npm install --omit=dev --ignore-scripts

# ── Etapa 2: Imagen final de producción ──
FROM node:22-alpine

LABEL maintainer="Energy School Team"
LABEL description="Puente MQTT (HiveMQ Cloud) a Supabase para monitoreo energético escolar"

WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar dependencias desde la etapa anterior
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar código fuente
COPY package.json ./
COPY index.js ./

# Cambiar a usuario no-root
USER appuser

# Render inyecta el puerto vía variable PORT.
# EXPOSE es documentativo; Render usa PORT internamente.
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:'+(process.env.PORT||3000)+'/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))" || exit 1

# Comando de inicio
CMD ["node", "index.js"]
