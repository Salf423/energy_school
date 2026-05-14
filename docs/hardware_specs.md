# Energy School — Especificaciones de Hardware IoT

> Documento técnico de referencia para la selección, conexión y despliegue del hardware
> de monitoreo y control energético en cada salón de la institución educativa.

---

## 1. Arquitectura General por Salón

Cada salón requiere un **nodo IoT independiente** compuesto por un microcontrolador,
sensores de medición eléctrica y actuadores de potencia. Todos los nodos se comunican
con el servidor central (Raspberry Pi / PC con Docker) a través de WiFi y el protocolo MQTT.

```
┌─────────────────────────────────────────────────────────────┐
│                        SALÓN N                              │
│                                                             │
│  ┌──────────┐    UART    ┌─────────────┐                    │
│  │  ESP32   │◄──────────►│ PZEM-004T   │──► Línea AC        │
│  │ WROOM-32 │            └─────────────┘   (medición)       │
│  │          │                                               │
│  │   GPIO   │──► Relé CH1 ──► Contactor ──► A/C             │
│  │   GPIO   │──► Relé CH2 ──► SSR ──────► Luces             │
│  │   GPIO   │──► Relé CH3 ──► SSR ──────► Enchufes          │
│  │          │                                               │
│  │   WiFi   │ ─ ─ ─ ─ ► Router ─ ─ ─ ► Broker MQTT         │
│  └──────────┘            (LAN)          (Docker)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Microcontrolador: ESP32-WROOM-32D

### ¿Por qué ESP32 y no ESP8266?

| Característica        | ESP8266         | ESP32-WROOM-32D     |
|-----------------------|-----------------|---------------------|
| Núcleos CPU           | 1 (80/160 MHz)  | 2 (240 MHz)         |
| GPIO disponibles      | ~11             | 34                  |
| ADC                   | 1 canal, 10-bit | 18 canales, 12-bit  |
| UART                  | 1.5 (limitado)  | 3 completos         |
| Bluetooth             | No              | BLE 4.2             |
| Consumo Deep Sleep    | ~20 µA          | ~10 µA              |
| Precio aproximado     | $2-4 USD        | $4-7 USD            |

### Especificaciones Seleccionadas

- **Modelo:** ESP32-WROOM-32D (módulo) o ESP32 DevKit V1 (placa de desarrollo)
- **Alimentación:** 5V DC vía USB o fuente regulada. Regulador interno a 3.3V.
- **Conectividad:** WiFi 802.11 b/g/n (2.4 GHz), indispensable para MQTT sobre TCP/IP.
- **Protocolos:** UART (para PZEM-004T), GPIO digital (para relés).
- **Framework recomendado:** Arduino IDE con librería `PubSubClient` para MQTT.

### Librerías de firmware necesarias (Arduino IDE)

```
PubSubClient        — Cliente MQTT ligero
ArduinoJson         — Serialización/deserialización de payloads JSON  
PZEM004Tv30         — Comunicación con el sensor PZEM-004T vía UART
WiFi                — Conectividad WiFi (incluida en el core ESP32)
```

---

## 3. Sensores de Medición Eléctrica

### Opción A (Recomendada): PZEM-004T v3.0

Sensor multifunción de grado industrial para medición en líneas AC.

| Parámetro           | Especificación                  |
|---------------------|---------------------------------|
| Voltaje medible     | 80V – 260V AC                   |
| Corriente medible   | 0 – 100A (con CT incluido)      |
| Potencia            | 0 – 23 kW                       |
| Energía acumulada   | 0 – 9999.99 kWh                 |
| Frecuencia          | 45 – 65 Hz                      |
| Factor de potencia  | 0.00 – 1.00                     |
| Interfaz            | UART (TTL 5V), Modbus-RTU       |
| Precisión           | ±1% (corriente), ±0.5% (voltaje)|
| Precio aprox.       | $8 – $15 USD                    |

**Conexión al ESP32:**
```
PZEM-004T TX  →  ESP32 GPIO16 (RX2)
PZEM-004T RX  →  ESP32 GPIO17 (TX2)  
PZEM-004T 5V  →  ESP32 5V (o fuente externa)
PZEM-004T GND →  ESP32 GND
```

> [!WARNING]
> El PZEM-004T se conecta a la LÍNEA VIVA de AC. La instalación debe ser
> realizada por un electricista certificado. Nunca manipular con la energía activa.

### Opción B (Económica): SCT-013-030

Transformador de corriente (CT) no invasivo, tipo pinza.

| Parámetro           | Especificación                  |
|---------------------|---------------------------------|
| Corriente medible   | 0 – 30A                         |
| Salida              | 0 – 1V AC (proporcional)        |
| Precisión           | ±2%                             |
| Instalación         | No invasiva (pinza sobre cable)  |
| Precio aprox.       | $3 – $6 USD                     |

**Desventajas respecto al PZEM-004T:**
- Solo mide corriente (no voltaje, potencia ni energía directamente).
- Requiere circuito acondicionador de señal (divisor de voltaje + capacitor de filtro).
- Cálculo de potencia requiere asumir voltaje constante (menos preciso).
- Usa el ADC del ESP32, que tiene ruido inherente.

**Recomendación:** Usar **PZEM-004T** como sensor principal. Reservar SCT-013 solo para
mediciones secundarias o si el presupuesto es extremadamente limitado.

---

## 4. Actuadores: Relés y Contactores

### 4.1 Módulo de Relés (Etapa de Control)

- **Modelo:** Módulo de 4 relés, 5V, con optoacopladores integrados
- **Capacidad por canal:** 10A @ 250VAC / 10A @ 30VDC (máximo del contacto)
- **Aislamiento:** Optoacoplador entre la lógica del ESP32 (3.3V) y la bobina del relé (5V)
- **Canales necesarios por salón:** 3 (A/C, Luces, Enchufes) + 1 de reserva
- **Precio aprox.:** $3 – $5 USD

> [!CAUTION]
> **NUNCA conectar una carga de alta potencia (como un aire acondicionado) directamente
> a las terminales del módulo de relés.** El relé de 10A del módulo sirve SOLO como etapa
> de señal para activar un contactor de potencia. Ignorar esto genera arcos eléctricos,
> sobrecalentamiento y RIESGO DE INCENDIO.

### 4.2 Contactores Magnéticos (Etapa de Potencia para A/C)

El contactor es un interruptor electromagnético de grado industrial diseñado para
conmutar cargas de alta corriente de forma segura y repetitiva.

**¿Por qué es obligatorio para Aires Acondicionados?**

| Factor                  | Relé pequeño (módulo)       | Contactor industrial        |
|-------------------------|-----------------------------|-----------------------------|
| Corriente nominal       | 10A                         | 9A – 95A (según modelo)     |
| Diseñado para           | Señales / cargas ligeras    | Motores, compresores, HVAC  |
| Ciclos de vida          | ~100,000                    | ~1,000,000                  |
| Supresión de arco       | Mínima                      | Cámara de arco dedicada     |
| Corriente de arranque   | No soporta picos            | Soporta 6-8x la nominal     |

**Modelos recomendados:**

| Modelo              | Bobina    | Corriente | Aplicación                    | Precio aprox.  |
|---------------------|-----------|-----------|-------------------------------|----------------|
| CJX2-0910 (Chint)   | 220V AC  | 9A        | A/C de ventana (≤ 12,000 BTU) | $5 – $8 USD    |
| CJX2-1810 (Chint)   | 220V AC  | 18A       | A/C split (12,000-18,000 BTU) | $8 – $12 USD   |
| CJX2-2510 (Chint)   | 220V AC  | 25A       | A/C split (18,000-24,000 BTU) | $10 – $15 USD  |
| LC1D09 (Schneider)  | 220V AC  | 9A        | A/C de ventana (premium)      | $15 – $25 USD  |
| LC1D18 (Schneider)  | 220V AC  | 18A       | A/C split (premium)           | $25 – $40 USD  |

### 4.3 Relés de Estado Sólido — SSR (Para Luces y Enchufes)

Para cargas menores a 10A (iluminación y enchufes de uso general), se recomienda
usar SSR (Solid State Relay) en lugar de relés mecánicos por mayor durabilidad.

- **Modelo recomendado:** SSR-10DA (10A) o SSR-25DA (25A con margen)
- **Entrada de control:** 3-32V DC (compatible directamente con GPIO del ESP32)
- **Salida:** 24-380V AC
- **Ventajas:** Sin partes mecánicas, conmutación silenciosa, sin chispas
- **Precio aprox.:** $3 – $6 USD

---

## 5. Cadena de Control Completa (Diagrama Eléctrico)

### Para Aires Acondicionados (Carga Pesada):

```
                    ETAPA DE CONTROL              ETAPA DE POTENCIA
                    (Bajo voltaje)                 (Alto voltaje)

ESP32 GPIO 25 ──► Relé 5V (CH1) ──► Bobina Contactor CJX2 ──► FASE L del A/C
                  (10A máx)         (220V AC, bobina)           (Línea viva)
                       │                    │
                       └── COM ── N         └── A1-A2 (bobina) ── N
                                            └── L1-T1 (potencia) ── A/C
                                            └── L2-T2 ── Neutro
```

### Para Luces y Enchufes (Carga Media):

```
ESP32 GPIO 26 ──► SSR-10DA (Entrada DC) ──► Línea de Iluminación (AC)
                  Control: 3.3V             Salida: 110V/220V AC
```

### Esquema de Protección Eléctrica por Salón:

```
Panel Eléctrico
      │
      ├── Breaker Principal (30A) ──► Distribución del salón
      │         │
      │         ├── Breaker A/C (20A) ──► Contactor ──► Aire Acondicionado
      │         ├── Breaker Luces (15A) ──► SSR ──► Circuito de iluminación
      │         └── Breaker Enchufes (15A) ──► SSR ──► Circuito de enchufes
      │
      └── Fuente 5V (1A) ──► ESP32 + Módulo Relés + PZEM-004T
```

---

## 6. Lista de Materiales por Salón (BOM)

| #  | Componente                        | Cantidad | Precio Unit. | Subtotal    |
|----|-----------------------------------|----------|--------------|-------------|
| 1  | ESP32 DevKit V1                   | 1        | $5 USD       | $5 USD      |
| 2  | PZEM-004T v3.0 (con CT)           | 1        | $12 USD      | $12 USD     |
| 3  | Módulo Relé 4CH (5V, optoacoplado)| 1        | $4 USD       | $4 USD      |
| 4  | Contactor CJX2-1810 (18A, 220V)   | 1        | $10 USD      | $10 USD     |
| 5  | SSR-10DA (Estado Sólido, 10A)     | 2        | $4 USD       | $8 USD      |
| 6  | Fuente de poder 5V 2A (Hi-Link)   | 1        | $4 USD       | $4 USD      |
| 7  | Caja de montaje eléctrico (IP54)  | 1        | $5 USD       | $5 USD      |
| 8  | Cables, borneras, fusibles        | 1 kit    | $5 USD       | $5 USD      |
| 9  | Disipador para SSR (aluminio)     | 2        | $1 USD       | $2 USD      |
|    |                                   |          | **TOTAL:**   | **~$55 USD**|

> **Para el servidor central:** Una Raspberry Pi 4 (4GB RAM, ~$55 USD) o cualquier
> PC con Linux ejecutando Docker es suficiente para el Broker MQTT y el backend Node.js.

---

## 7. Consideraciones de Seguridad Eléctrica

1. **Toda la instalación eléctrica de potencia debe ser realizada por un electricista certificado.**
2. Los circuitos de bajo voltaje (ESP32, sensores) deben estar **físicamente separados** de los de alto voltaje (contactores, línea AC) dentro de la caja de montaje.
3. Cada circuito de potencia debe tener su **breaker/disyuntor** individual.
4. Los contactores deben montarse sobre **riel DIN** en un gabinete eléctrico apropiado.
5. Todos los cables de potencia deben ser de calibre adecuado (mínimo AWG 12 para A/C).
6. Verificar que la **corriente de arranque** del A/C no exceda la capacidad del contactor seleccionado (factor de seguridad 1.5x).

---

## 8. Formato del Payload MQTT (ESP32 → Broker)

Cada ESP32 publica datos en formato JSON al tópico correspondiente:

**Tópico:** `escuela/salon_1/sensores`

**Payload:**
```json
{
  "salon_id": "uuid-del-salon-en-supabase",
  "voltaje": 120.5,
  "corriente": 8.3,
  "potencia_w": 998.15,
  "energia_kwh": 15.72,
  "frecuencia": 60.0,
  "factor_potencia": 0.99,
  "dispositivo": "aire_acondicionado",
  "timestamp": 1684012345
}
```

**Frecuencia de envío recomendada:** Cada 10-30 segundos (balance entre precisión y tráfico de red).
