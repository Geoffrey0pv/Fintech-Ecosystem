# Fintech · Módulo de Movimientos Financieros Personales (MVP)

Backend **NestJS + TypeScript** (arquitectura hexagonal) + frontend **Next.js**, persistencia real en **PostgreSQL** vía **Prisma**, todo orquestado con **Docker Compose**. Implementa autenticación segura, CRUD de movimientos con filtros/paginación/balance, y categorías con presupuestos mensuales y alertas automáticas (80% / 100%).

> La fuente única de verdad del diseño es [`SPEC_KIT.md`](./SPEC_KIT.md).

---

## 1. Versiones de runtimes

| Componente | Versión |
|------------|---------|
| Node.js | **20.18 LTS** (imágenes Docker `node:20-slim`; probado en local con Node 20+/24) |
| npm | 10+ (workspaces) |
| PostgreSQL | **16** (`postgres:16-alpine`) |
| NestJS | 10.4 |
| Prisma | 5.22 |
| Next.js | 14.2.33 |
| React | 18.3 |
| Docker Compose | spec 3.9+ |

---

## 2. Arranque con un solo comando

Requisitos: Docker + Docker Compose.

```bash
docker compose up --build
```

Esto levanta, comunicados por variables de entorno y con **persistencia real** (volumen `pgdata`):

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| PostgreSQL | localhost:5432 |

El backend aplica migraciones (`prisma migrate deploy`) y ejecuta un **seed idempotente** en cada arranque.

### Usuario por defecto (seed)

| Email | Contraseña |
|-------|------------|
| `demo@fintech.co` | `Demo1234!` |

El seed crea además categorías (`Alimentación`, `Transporte`) con presupuesto del mes y algunos movimientos de ejemplo.

> **Nota de demo:** el stack corre sobre `http://localhost`, por lo que las cookies de sesión van con `Secure=false` (`COOKIE_SECURE=false`) y se generan claves RS256 efímeras si no se proveen. En un despliegue real con HTTPS debe usarse `COOKIE_SECURE=true` y claves `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` persistentes (ver §6).

---

## 3. Desarrollo local (sin Docker para las apps)

```bash
# 1. Base de datos
docker run -d --name fintech-pg -p 5432:5432 \
  -e POSTGRES_USER=fintech -e POSTGRES_PASSWORD=fintech -e POSTGRES_DB=fintech_movements \
  postgres:16-alpine

# 2. Dependencias (monorepo npm workspaces)
npm install

# 3. Backend
cp .env.example apps/backend/.env   # ajustar DATABASE_URL a localhost
npm run prisma:deploy --workspace @fintech/backend
npm run prisma:seed   --workspace @fintech/backend
npm run start:dev     --workspace @fintech/backend   # http://localhost:4000

# 4. Frontend (otra terminal)
npm run dev --workspace @fintech/frontend            # http://localhost:3000
```

---

## 4. Justificación del stack (contexto fintech)

- **NestJS + TypeScript** — DI nativa que habilita **arquitectura hexagonal** real (dominio aislado de framework y de Prisma), tipado estático que reduce errores en lógica monetaria, y primitivas de seguridad transversales (guards, interceptores, `class-validator`).
- **PostgreSQL + Prisma** — ACID estricto y tipo `NUMERIC(18,2)` exacto para dinero; migraciones versionadas y auditables; cliente type-safe que elimina SQL injection por construcción.
- **Dinero exacto** — todos los montos usan `NUMERIC`/`Decimal` (decimal.js) y se transportan como **string**; nunca `float`/`double`.
- **Next.js + React Query** — UI funcional que consume la API con cookies HTTP-Only (`credentials: 'include'`).
- **Docker Compose** — reproducibilidad y arranque de un comando con persistencia real.

### Arquitectura (hexagonal por módulo)

```
domain        ← entidades y reglas puras (Money, evaluateBudget, Email)
application   ← casos de uso + DTOs + ports (interfaces de repositorio)
infrastructure← controladores HTTP, repositorios Prisma, seguridad
```

Estructura del monorepo: `apps/backend`, `apps/frontend`, `packages/`.

---

## 5. Seguridad (resumen)

- **Argon2id** para contraseñas (parámetros OWASP). Hash nunca se loguea ni se devuelve.
- **JWT RS256**, access token de 15 min en **cookie HTTP-Only / SameSite=Strict**; refresh token opaco, hasheado (SHA-256) en BD, **rotativo con detección de reuso** (revoca la familia).
- **Aislamiento estricto multi-tenant**: el `userId` proviene **solo** del token verificado (`@CurrentUser`), nunca del body/query; todo acceso por id se hace con `WHERE { id, userId }` y devuelve **404** (no 403) ante recursos ajenos para no filtrar su existencia.
- `helmet`, CORS restringido con credenciales, `ValidationPipe` con `whitelist` + `forbidNonWhitelisted` (bloquea mass-assignment como inyectar `userId`), y **rate limiting** en login/registro.

---

## 6. Variables de entorno

Ver [`.env.example`](./.env.example). Claves principales:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Claves RS256 (PEM). Si faltan, se generan efímeras (warning) |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | TTL en segundos (900 / 604800) |
| `COOKIE_SECURE` | `true` tras HTTPS, `false` para http local |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | Usuario sembrado |
| `FRONTEND_URL` | Origen permitido por CORS |
| `NEXT_PUBLIC_API_URL` | Base de la API para el frontend |

---

## 7. API (resumen)

Base: `/api/v1`. Envelope estándar: `{ data, meta, error }`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` · `/auth/login` | Registro / login (setea cookies) |
| POST | `/auth/refresh` · `/auth/logout` | Rotación / cierre de sesión |
| GET | `/auth/me` | Usuario actual |
| POST/GET/PATCH/DELETE | `/movements` … | CRUD de movimientos |
| GET | `/movements?page&limit&sort&order&type&categoryId&startDate&endDate` | Listado filtrado/paginado |
| GET | `/movements/balance` | Balance neto (ingresos − egresos) |
| POST/GET/PATCH/DELETE | `/categories` … | CRUD de categorías |
| PUT/GET | `/categories/:id/budget` | Asignar / consultar presupuesto mensual |
| GET | `/budgets/status?year&month` | Estado de todas las categorías del mes |

**Alertas (Módulo 3):** al registrar un egreso en una categoría con presupuesto, la respuesta incluye `meta.budgetAlerts` con `WARNING_80` (≥80%) o `CRITICAL_100` (≥100%).

---

## 8. Pruebas y calidad

```bash
# Unitarias + cobertura (dominio + aplicación)
npm run test:cov --workspace @fintech/backend

# E2E contra PostgreSQL real (sin mocks de negocio)
#   crea la BD de test y exporta DATABASE_URL apuntando a fintech_test
NODE_ENV=test npm run test:e2e --workspace @fintech/backend

# Frontend
npm run test:cov --workspace @fintech/frontend
```

- **94 pruebas** (68 unit + 26 e2e backend, + 3 frontend) verdes.
- Umbrales de cobertura bloqueantes: global ≥80% (branches ≥75%), dominio ≥90%.
- Escenarios críticos cubiertos: disparo exacto de alertas 80/100%, **lectura/escritura cruzada entre usuarios bloqueada (404)**, rechazo de `userId` inyectado, rotación y reuso de refresh tokens, precisión decimal del dinero.

---

## 9. CI/CD

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) (GitHub Actions):

1. Lint (ESLint) — análisis estático.
2. Typecheck (tsc).
3. Migraciones + tests unitarios (cobertura) + e2e contra PostgreSQL real.
4. Tests y build del frontend.
5. (Opcional) SonarCloud si `SONAR_TOKEN` está configurado.
6. Build de imágenes Docker de backend y frontend.

---

## 10. Despliegue

URL de despliegue: _pendiente_. La aplicación es portable vía Docker; para desplegar basta proveer `DATABASE_URL`, claves JWT persistentes y `COOKIE_SECURE=true` detrás de HTTPS, y construir las imágenes (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`).

---

## 11. Decisiones ante ambigüedad

- **Monto siempre positivo**; el signo lo determina `type` (INCOME/EXPENSE). Simplifica balance y filtros.
- **Alerta = estado acumulado del mes** tras la operación (determinista y testeable), no un evento de “cruce”.
- **Consumo de presupuesto se calcula on-the-fly** (no se cachea) para garantizar exactitud financiera, apoyado en índice compuesto `[userId, categoryId, occurredAt]`.
- **404 en lugar de 403** para recursos ajenos (no se revela su existencia).
- **npm workspaces** en lugar de pnpm (pnpm no disponible en el entorno objetivo); decisión documentada.

---

## 12. AI Usage

### Herramientas utilizadas

| Herramienta | Modelo | Tareas |
|-------------|--------|--------|
| **Claude Code** (CLI) | Claude Opus | Scaffolding del monorepo, implementación iterativa de módulos, redacción de pruebas unitarias/e2e, configuración de Docker y CI, diagnóstico de errores de build/test. |

El criterio de arquitectura, seguridad y diseño es propio; la IA se usó como acelerador, validando cada salida con tests y typecheck.

### Ejemplo 1 — Validación de variables de entorno numéricas

- **Pedido:** “los tests e2e fallan con `BACKEND_PORT/ACCESS_TOKEN_TTL has failed the following constraints: isInt`”.
- **Resultado:** la IA propuso confiar en `enableImplicitConversion` de class-transformer. **No era suficiente** en el contexto de ts-jest (la metadata de tipos no siempre está disponible al evaluar los decoradores). Se corrigió añadiendo `@Type(() => Number)` explícito a cada campo numérico, lo que es robusto en runtime y en tests.

### Ejemplo 2 — Aislamiento de datos entre usuarios

- **Pedido:** generar el repositorio de movimientos garantizando que un usuario no pueda tocar datos de otro.
- **Resultado:** se implementó `updateMany`/`deleteMany` con `WHERE { id, userId }` y conversión del `count === 0` en **404**, en lugar de un `findById` + chequeo posterior. Esto cierra una condición de carrera y evita filtrar la existencia del recurso. Cubierto por pruebas e2e con un token válido de un tercero.

### Ejemplo donde se corrigió/rechazó una sugerencia

- En los tests e2e, la IA intentó desactivar el rate limiting con `overrideGuard(ThrottlerGuard)`. **No funciona** para guards registrados como `APP_GUARD`. Se reemplazó por `skipIf: () => NODE_ENV === 'test'` a nivel del `ThrottlerModule`, solución correcta y declarativa.
- La generación de claves JWT inicialmente lanzaba error fatal en producción si faltaban; para que `docker compose up` funcione sin configuración previa, se cambió a **generar claves efímeras con un warning explícito** y se documentó que producción debe proveer claves persistentes. Decisión de ingeniería para equilibrar seguridad y reproducibilidad del demo.

### Valoración

El uso de IA aceleró notablemente el scaffolding repetitivo (DTOs, módulos, repositorios) y la redacción de pruebas, liberando tiempo para las decisiones de diseño. El mayor valor humano estuvo en **detectar y corregir** suposiciones de la IA (conversión de tipos, guards globales, manejo de claves) que solo se evidencian al ejecutar tests y el stack real — lo que refuerza que la verificación continua (typecheck + tests + arranque real) es indispensable.
