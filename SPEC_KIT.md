# SPEC_KIT.md — Fintech Personal Movements Module

> **Single Source of Truth (SSOT)** para el agente autónomo de codificación.
> Este documento es **normativo**: el agente debe implementar exactamente lo aquí
> definido. Cuando un detalle no esté especificado, debe seguir las convenciones
> establecidas en este archivo y **registrar la decisión** en la sección 7 (AI Usage Log).
>
> - **Producto:** Módulo de gestión de movimientos financieros personales (MVP).
> - **Dominio:** Fintech (Colombia). Moneda base: **COP** (Pesos colombianos, sin decimales por defecto, pero el motor soporta decimales).
> - **Naturaleza:** Listo para producción, revisión de pares y análisis de calidad automatizado.
> - **Restricciones innegociables:** persistencia real (sin mocks/memoria para datos de negocio), aislamiento estricto entre usuarios, seguridad bloqueante, tests + CI/CD + análisis de calidad.

---

## Tabla de contenidos

1. [Architecture & Tech Stack Justification](#1-architecture--tech-stack-justification)
2. [Database Schema & Data Isolation](#2-database-schema--data-isolation)
3. [Security & Authentication Protocol](#3-security--authentication-protocol)
4. [API Endpoints & Contracts Definition](#4-api-endpoints--contracts-definition)
5. [Testing & Quality Assurance Strategy](#5-testing--quality-assurance-strategy)
6. [DevOps & CI/CD Pipeline Skeleton](#6-devops--cicd-pipeline-skeleton)
7. [AI Usage Log Template](#7-ai-usage-log-template)

---

## 1. Architecture & Tech Stack Justification

### 1.1 Stack tecnológico (decisión normativa)

| Capa | Tecnología | Versión exacta (pin) | Justificación Fintech |
|------|------------|----------------------|------------------------|
| **Backend** | **NestJS + TypeScript** | NestJS `10.x`, Node.js `20.18.x LTS`, TS `5.5.x` | Framework opinado con **Inversión de Dependencias (DI)** nativa que facilita Arquitectura Hexagonal; tipado estático reduce errores en lógica monetaria; ecosistema maduro de validación (`class-validator`), guards e interceptores para seguridad transversal. |
| **ORM** | **Prisma** | `5.x` | Migraciones versionadas y reproducibles (auditables), tipo `Decimal` nativo de PostgreSQL, cliente type-safe que elimina SQL injection por construcción y soporta transacciones ACID. |
| **Base de datos** | **PostgreSQL** | `16.x` | ACID estricto, tipo `NUMERIC` exacto para dinero, `Row Level Security` opcional, índices parciales, soporte de `citext` para emails. Estándar de facto en fintech. |
| **Frontend** | **Next.js (App Router) + React** | Next `14.x`, React `18.x` | SSR/CSR híbrido, manejo seguro de cookies HTTP-Only vía Route Handlers, buen DX. |
| **Estado servidor (FE)** | **TanStack Query** | `5.x` | Cache, reintentos y manejo declarativo de estados de red. |
| **Validación** | `class-validator` + `class-transformer` (BE), `zod` (FE) | últimas estables | Validación explícita de tipos y rangos en el borde. |
| **Auth** | `jsonwebtoken` / `@nestjs/jwt`, `argon2` | últimas estables | Ver sección 3. |
| **Testing** | **Jest** + **Supertest** (BE), **Vitest** + **Testing Library** (FE) | últimas estables | Unit + integración + e2e. |
| **Contenerización** | **Docker + Docker Compose** | Compose spec `3.9` | Reproducibilidad y arranque de un solo comando. |
| **Calidad** | ESLint + Prettier + SonarCloud | últimas estables | Análisis estático bloqueante en CI. |

> **Regla monetaria absoluta:** los valores monetarios **NUNCA** usan `float`/`double`/`number` para almacenamiento ni cálculo persistente. Se usa `Decimal` (PostgreSQL `NUMERIC(18,2)`) en BD y `Prisma.Decimal` (basado en `decimal.js`) en la capa de dominio. En transporte JSON se serializan como **string** para evitar pérdida de precisión IEEE-754.

### 1.2 Patrón de diseño: Arquitectura Hexagonal (Ports & Adapters)

Cada módulo de negocio del backend se organiza en cuatro capas con dependencia unidireccional **hacia el dominio**:

```
            ┌─────────────────────────────────────────────┐
            │  Infrastructure (Adapters)                  │
            │  Controllers REST · Prisma Repos · JWT · ... │
            │        │ implementa          ▲ usa           │
            │        ▼                     │               │
            │  Application (Use Cases)                     │
            │  Services · DTOs · Ports (interfaces)        │
            │        │ usa                 ▲               │
            │        ▼                     │               │
            │  Domain (Entities · Value Objects · Rules)   │
            │  Money VO · Movement · Budget · invariantes  │
            └─────────────────────────────────────────────┘
```

- **Domain:** entidades puras, *value objects* (`Money`, `Email`, `DateRange`), reglas de negocio (cálculo de presupuesto). Sin dependencias de framework ni de Prisma.
- **Application:** casos de uso (`CreateMovementUseCase`, `GetBudgetStatusUseCase`), DTOs, y **ports** (interfaces de repositorio: `MovementRepositoryPort`).
- **Infrastructure:** adaptadores que implementan los ports (Prisma), controladores HTTP, guards, módulos NestJS.
- **Regla de dependencia:** Domain no importa de Application ni Infrastructure; Application no importa de Infrastructure.

### 1.3 Estructura de carpetas (monorepo)

Monorepo con workspaces (npm/pnpm). El agente debe crear **exactamente** esta estructura:

```
fintech-movements/
├── docker-compose.yml
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── SPEC_KIT.md
├── package.json                  # workspaces: ["apps/*"]
├── pnpm-workspace.yaml
│
├── apps/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── .eslintrc.cjs
│   │   ├── jest.config.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── test/
│   │   │   └── e2e/
│   │   │       ├── auth.e2e-spec.ts
│   │   │       ├── movements.e2e-spec.ts
│   │   │       └── budgets.e2e-spec.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/
│   │       │   ├── env.validation.ts
│   │       │   └── configuration.ts
│   │       ├── shared/
│   │       │   ├── domain/
│   │       │   │   ├── value-objects/
│   │       │   │   │   ├── money.vo.ts
│   │       │   │   │   ├── email.vo.ts
│   │       │   │   │   └── date-range.vo.ts
│   │       │   │   └── errors/
│   │       │   │       └── domain.error.ts
│   │       │   ├── infrastructure/
│   │       │   │   ├── prisma/
│   │       │   │   │   ├── prisma.module.ts
│   │       │   │   │   └── prisma.service.ts
│   │       │   │   ├── http/
│   │       │   │   │   ├── filters/all-exceptions.filter.ts
│   │       │   │   │   ├── interceptors/response.interceptor.ts
│   │       │   │   │   └── decorators/current-user.decorator.ts
│   │       │   │   └── security/
│   │       │   │       ├── jwt-auth.guard.ts
│   │       │   │       └── tenant.guard.ts
│   │       │   └── application/
│   │       │       └── dto/pagination.dto.ts
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.module.ts
│   │           │   ├── domain/
│   │           │   ├── application/
│   │           │   │   ├── auth.service.ts
│   │           │   │   ├── ports/user.repository.port.ts
│   │           │   │   └── dto/{register,login}.dto.ts
│   │           │   └── infrastructure/
│   │           │       ├── auth.controller.ts
│   │           │       └── persistence/prisma-user.repository.ts
│   │           ├── movements/
│   │           │   ├── movements.module.ts
│   │           │   ├── domain/movement.entity.ts
│   │           │   ├── application/
│   │           │   │   ├── movements.service.ts
│   │           │   │   ├── ports/movement.repository.port.ts
│   │           │   │   └── dto/{create,update,query,balance}.dto.ts
│   │           │   └── infrastructure/
│   │           │       ├── movements.controller.ts
│   │           │       └── persistence/prisma-movement.repository.ts
│   │           ├── categories/
│   │           │   └── (misma estructura hexagonal)
│   │           └── budgets/
│   │               ├── budgets.module.ts
│   │               ├── domain/budget-status.service.ts   # regla crítica módulo 3
│   │               ├── application/budgets.service.ts
│   │               └── infrastructure/budgets.controller.ts
│   │
│   └── frontend/
│       ├── Dockerfile
│       ├── package.json
│       ├── next.config.mjs
│       ├── tsconfig.json
│       ├── .eslintrc.cjs
│       ├── vitest.config.ts
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/page.tsx
│           │   ├── (auth)/register/page.tsx
│           │   ├── (dashboard)/movements/page.tsx
│           │   ├── (dashboard)/budgets/page.tsx
│           │   └── layout.tsx
│           ├── lib/
│           │   ├── api-client.ts          # fetch con credentials: 'include'
│           │   └── schemas.ts             # zod
│           ├── components/
│           └── hooks/
│               ├── use-movements.ts
│               └── use-budgets.ts
│
└── packages/
    └── shared-types/                      # contratos TS compartidos FE/BE
        ├── package.json
        └── src/index.ts                   # enums, DTO types, alert codes
```

---

## 2. Database Schema & Data Isolation

### 2.1 Modelo entidad-relación

```
User (1) ───< (N) Category (1) ───< (N) Budget        [Budget por categoría/mes]
  │                    │
  │                    └──< (N) FinancialMovement
  └────────────< (N) FinancialMovement

Reglas:
- Todo registro de negocio pertenece a un User (userId NOT NULL, FK ON DELETE CASCADE).
- Category es propiedad del User (no globales) → aislamiento total.
- Budget: una fila por (categoryId, year, month) → UNIQUE compuesto.
- FinancialMovement.categoryId es opcional para INGRESO, requerido para EGRESO con presupuesto.
```

### 2.2 `schema.prisma` (normativo)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum MovementType {
  INCOME   // ingreso
  EXPENSE  // egreso
}

model User {
  id           String              @id @default(uuid()) @db.Uuid
  email        String              @unique @db.Citext        // case-insensitive
  passwordHash String                                         // Argon2id
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  categories   Category[]
  movements    FinancialMovement[]

  @@map("users")
}

model Category {
  id        String              @id @default(uuid()) @db.Uuid
  userId    String              @db.Uuid
  name      String              @db.VarChar(80)
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  budgets   Budget[]
  movements FinancialMovement[]

  @@unique([userId, name])                  // sin nombres duplicados por usuario
  @@index([userId])
  @@map("categories")
}

model Budget {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid              // desnormalizado para WHERE de aislamiento
  categoryId String   @db.Uuid
  // Presupuesto mensual máximo. NUMERIC exacto, jamás float.
  amount     Decimal  @db.Decimal(18, 2)
  year       Int                            // ej. 2026
  month      Int                            // 1..12
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, year, month])       // un presupuesto por categoría/mes
  @@index([userId, year, month])
  @@map("budgets")
}

model FinancialMovement {
  id          String       @id @default(uuid()) @db.Uuid
  userId      String       @db.Uuid
  categoryId  String?      @db.Uuid          // opcional para INCOME
  type        MovementType
  // Valor SIEMPRE positivo; el signo lo determina `type`. NUMERIC exacto.
  amount      Decimal      @db.Decimal(18, 2)
  description String       @db.VarChar(255)
  occurredAt  DateTime     @db.Date          // fecha del movimiento (sin hora)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([userId, occurredAt])             // listado/orden por fecha
  @@index([userId, type])
  @@index([userId, categoryId, occurredAt]) // cálculo de presupuesto consumido
  @@map("financial_movements")
}
```

### 2.3 Tipos de datos precisos (reglas)

| Concepto | Tipo BD | Tipo dominio | Prohibido |
|----------|---------|--------------|-----------|
| Dinero (amount, budget) | `NUMERIC(18,2)` | `Prisma.Decimal` / `Money` VO | `float`, `double`, `real`, `number` JS |
| Identificadores | `UUID v4` | `string` | enteros autoincrementales expuestos |
| Email | `CITEXT` | `Email` VO | comparación case-sensitive |
| Fecha de movimiento | `DATE` | `Date` (UTC, solo fecha) | strings sin validar |
| Tipo de movimiento | `enum MovementType` | enum TS | strings libres |

> El **`amount` siempre se almacena positivo**. El balance se calcula como `Σ(INCOME) − Σ(EXPENSE)`. Esto evita ambigüedad de signos y simplifica los filtros por tipo.

### 2.4 Estrategia de aislamiento estricto (Multi-tenant a nivel de fila)

**Principio:** ningún usuario puede leer, modificar ni inferir datos de otro. El `userId` **nunca** proviene del body o query del request; **siempre** se extrae del token de sesión verificado.

Defensa en profundidad (3 capas obligatorias):

1. **Capa de aplicación — `userId` del token, no del cliente.**
   Todo caso de uso recibe el `userId` desde `@CurrentUser()` (extraído del JWT validado por el guard). Está **prohibido** aceptar `userId` en DTOs de entrada.

2. **Capa de repositorio — cláusula `WHERE userId` obligatoria.**
   Cada método de repositorio Prisma incluye `userId` en el `where`, incluso para operaciones por `id`:

   ```typescript
   // prisma-movement.repository.ts
   async findByIdForUser(id: string, userId: string) {
     return this.prisma.financialMovement.findFirst({
       where: { id, userId },              // ← aislamiento: id SOLO si pertenece al user
     });
   }

   async updateForUser(id: string, userId: string, data: UpdateData) {
     // updateMany devuelve count; si count===0 → no era suyo o no existe → 404
     const { count } = await this.prisma.financialMovement.updateMany({
       where: { id, userId },
       data,
     });
     if (count === 0) throw new NotFoundException('Movement not found');
   }

   async deleteForUser(id: string, userId: string) {
     const { count } = await this.prisma.financialMovement.deleteMany({
       where: { id, userId },
     });
     if (count === 0) throw new NotFoundException('Movement not found');
   }
   ```

   > **Regla de respuesta:** ante un recurso ajeno se devuelve **404 Not Found** (no 403), para no revelar la existencia del recurso (evita enumeración de IDs).

3. **Capa de BD — defensa adicional opcional (PostgreSQL RLS).**
   Recomendado activar Row Level Security como red de seguridad. El agente debe incluir esta migración como capa adicional (no sustituye las cláusulas WHERE):

   ```sql
   ALTER TABLE financial_movements ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON financial_movements
     USING (user_id = current_setting('app.current_user_id')::uuid);
   -- La app ejecuta SET app.current_user_id = '<uuid>' por transacción.
   ```

   > Si la complejidad operativa de RLS no es viable en el MVP, documentar la omisión en la sección 7 y mantener obligatorias las capas 1 y 2.

---

## 3. Security & Authentication Protocol

### 3.1 Autenticación: JWT + cookies HTTP-Only

- **Algoritmo de firma:** **RS256** (par de claves asimétricas). Justificación: la clave privada de firma queda aislada; permite rotación y verificación distribuida sin compartir secreto. Para el MVP se acepta **HS256** documentando el trade-off, pero RS256 es la opción normativa.
- **Access token:** expiración **15 minutos**. Contiene claims mínimos: `sub` (userId), `iat`, `exp`, `jti`, `type: "access"`. **No** incluir datos sensibles ni PII más allá del `sub`.
- **Refresh token:** expiración **7 días**, rotativo (one-time use). Se almacena su **hash** en BD para revocación; se rota en cada uso (detección de reuso → revocar familia).
- **Transporte:** ambos tokens viajan en **cookies HTTP-Only** (no accesibles por JS → mitiga XSS), nunca en `localStorage`.

Configuración de cookies (normativa):

```typescript
// access_token y refresh_token
res.cookie('access_token', accessJwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS en prod
  sameSite: 'strict',                              // mitiga CSRF
  path: '/',
  maxAge: 15 * 60 * 1000,                          // 15 min
});
res.cookie('refresh_token', refreshJwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',                            // alcance reducido
  maxAge: 7 * 24 * 60 * 60 * 1000,                 // 7 días
});
```

> **CSRF:** con `SameSite=Strict` el riesgo se mitiga. Adicionalmente, para mutaciones se exige header `X-Requested-With: XMLHttpRequest` o token CSRF doble-cookie. Documentar la elección.

### 3.2 Encriptación de contraseñas

- **Algoritmo:** **Argon2id** (`argon2` npm). Parámetros mínimos: `memoryCost=19456` (19 MiB), `timeCost=2`, `parallelism=1` (alineado a OWASP). Alternativa aceptada: **Bcrypt** con `cost ≥ 12`.
- **Reglas:** nunca loguear ni devolver `passwordHash`; comparación con `argon2.verify`; rehash transparente si cambian los parámetros.

```typescript
import * as argon2 from 'argon2';

const hash = await argon2.hash(plainPassword, {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const ok = await argon2.verify(hash, plainPassword);
```

**Política de contraseñas (validación en DTO):** mínimo 10 caracteres, al menos una mayúscula, una minúscula, un dígito. Rechazar contraseñas en listas comunes (opcional).

### 3.3 Middleware / Guards de control de acceso global

- **`JwtAuthGuard` (global):** registrado con `APP_GUARD`. Valida el access token de la cookie en cada request; rechaza con **401** si falta/expira/inválido. Rutas públicas se marcan con decorador `@Public()`.
- **`@CurrentUser()` decorator:** inyecta `{ userId }` desde el token validado. Única fuente de identidad para los casos de uso.
- **Rate limiting:** `@nestjs/throttler` global — login/register limitados (ej. 5 intentos / 60 s por IP) para mitigar fuerza bruta.
- **Headers de seguridad:** `helmet` activado en `main.ts`. CORS restringido al origen del frontend con `credentials: true`.
- **Filtro global de excepciones:** normaliza errores, **no filtra stack traces ni detalles internos** al cliente en producción.

```typescript
// main.ts (extracto normativo)
app.use(helmet());
app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
app.use(cookieParser());
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // descarta props no declaradas
  forbidNonWhitelisted: true, // 400 si llegan props extra
  transform: true,            // aplica class-transformer
}));
app.setGlobalPrefix('api/v1');
```

---

## 4. API Endpoints & Contracts Definition

**Convenciones globales:**

- Base path: `/api/v1`.
- Autenticación: cookie HTTP-Only `access_token` (salvo rutas `@Public()`).
- Montos en JSON: **string** decimal (`"150000.00"`).
- Fechas en JSON: ISO-8601 (`"2026-06-23"` para `DATE`, `"2026-06-23T15:04:05.000Z"` para timestamps).
- **Envelope de respuesta estándar** (vía interceptor):

```jsonc
{
  "data": { /* payload */ },
  "meta": { /* paginación, alertas, etc. (opcional) */ },
  "error": null
}
```

- **Envelope de error estándar** (vía filtro):

```jsonc
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be a positive decimal",
    "details": [ { "field": "amount", "issue": "isPositive" } ]
  }
}
```

Códigos HTTP: `200` OK, `201` Created, `204` No Content, `400` validación, `401` no autenticado, `404` no encontrado/ajeno, `409` conflicto (email/categoría duplicada), `422` regla de negocio, `429` rate limit.

### 4.1 Módulo 1 — Auth

#### `POST /api/v1/auth/register` `@Public`

Request DTO:
```jsonc
{
  "email": "user@example.com",   // IsEmail, normalizado a lowercase
  "password": "Str0ngPass!"      // min 10, 1 mayús, 1 minús, 1 dígito
}
```
Validaciones: `email` único (→ 409 `EMAIL_TAKEN`). Respuesta `201`:
```jsonc
{ "data": { "id": "uuid", "email": "user@example.com" }, "meta": null, "error": null }
```

#### `POST /api/v1/auth/login` `@Public`

Request DTO: `{ "email": "...", "password": "..." }`
Respuesta `200`: setea cookies `access_token` + `refresh_token`. Body:
```jsonc
{ "data": { "id": "uuid", "email": "user@example.com" }, "meta": null, "error": null }
```
Credenciales inválidas → **401** `INVALID_CREDENTIALS` (mensaje genérico, sin distinguir email vs password).

#### `POST /api/v1/auth/refresh` `@Public` (usa cookie refresh_token)
Rota tokens. Reuso detectado → revoca familia, **401**.

#### `POST /api/v1/auth/logout`
Limpia cookies y revoca refresh token. `204`.

#### `GET /api/v1/auth/me`
Devuelve el usuario del token. `200`: `{ "data": { "id", "email" } }`.

### 4.2 Módulo 2 — Movimientos financieros

#### `POST /api/v1/movements`

Request DTO (`CreateMovementDto`):
```jsonc
{
  "type": "EXPENSE",            // IsEnum(MovementType)
  "amount": "150000.00",        // IsDecimal, IsPositive, max 2 decimales, > 0
  "description": "Mercado",     // IsString, 1..255
  "categoryId": "uuid|null",    // IsUUID; requerido si type=EXPENSE y se desea control de presupuesto
  "occurredAt": "2026-06-23"    // IsDateString (formato fecha)
}
```
Respuesta `201`: el movimiento creado. **Si es EXPENSE con categoría presupuestada**, incluir alertas en `meta` (ver 4.3).

#### `GET /api/v1/movements` — listado con paginación, orden y filtros

Query params (`QueryMovementsDto`):

| Param | Tipo | Default | Validación |
|-------|------|---------|------------|
| `page` | int | `1` | `Min(1)` |
| `limit` | int | `20` | `Min(1)`, `Max(100)` |
| `sort` | enum | `occurredAt` | `IsIn(['occurredAt','amount','createdAt'])` |
| `order` | enum | `desc` | `IsIn(['asc','desc'])` |
| `type` | enum | — | `IsEnum(MovementType)` opcional |
| `categoryId` | uuid | — | `IsUUID` opcional |
| `startDate` | date | — | `IsDateString`; `≤ endDate` |
| `endDate` | date | — | `IsDateString`; `≥ startDate` |

Ejemplo: `GET /api/v1/movements?page=2&limit=20&sort=occurredAt&order=desc&type=EXPENSE&categoryId=<uuid>&startDate=2026-06-01&endDate=2026-06-30`

Respuesta `200`:
```jsonc
{
  "data": [ { "id": "uuid", "type": "EXPENSE", "amount": "150000.00",
             "description": "Mercado", "categoryId": "uuid",
             "occurredAt": "2026-06-23", "createdAt": "..." } ],
  "meta": {
    "pagination": { "page": 2, "limit": 20, "totalItems": 134, "totalPages": 7 }
  },
  "error": null
}
```

> **Aislamiento:** la consulta SIEMPRE filtra por `userId` del token. El total se cuenta con el mismo `where`.

#### `GET /api/v1/movements/:id`
`200` el movimiento; **404** si no es del usuario.

#### `PATCH /api/v1/movements/:id`
Request: campos parciales del `CreateMovementDto`. Usa `updateForUser` (404 si ajeno). `200` con movimiento actualizado + `meta.alerts` si aplica.

#### `DELETE /api/v1/movements/:id`
`updateForUser`/`deleteForUser`. `204`; **404** si ajeno.

#### `GET /api/v1/movements/balance` — balance general

Query opcional: `startDate`, `endDate` (mismo formato/validación que listado).

Respuesta `200`:
```jsonc
{
  "data": {
    "totalIncome": "3200000.00",
    "totalExpense": "1850000.00",
    "balance": "1350000.00",
    "currency": "COP",
    "period": { "startDate": "2026-06-01", "endDate": "2026-06-30" }
  },
  "meta": null,
  "error": null
}
```
Cálculo SQL (agregación con `WHERE userId`): `SUM(amount) FILTER (WHERE type='INCOME') - SUM(amount) FILTER (WHERE type='EXPENSE')`, usando `Decimal`.

### 4.3 Módulo 3 — Categorías, presupuestos y alertas (regla de negocio crítica)

#### Categorías

- `POST /api/v1/categories` → `{ "name": "Alimentación" }` (`IsString` 1..80). Único por usuario (→ 409 `CATEGORY_EXISTS`). `201`.
- `GET /api/v1/categories` → lista de categorías del usuario. `200`.
- `PATCH /api/v1/categories/:id` → renombrar. 404 si ajena.
- `DELETE /api/v1/categories/:id` → `204`; movimientos asociados quedan con `categoryId=null` (`SetNull`).

#### Presupuestos

- `PUT /api/v1/categories/:categoryId/budget` (upsert mensual):
  ```jsonc
  { "amount": "800000.00", "year": 2026, "month": 6 }  // amount IsPositive; month 1..12
  ```
  Upsert por `(categoryId, year, month)`. `200`.

- `GET /api/v1/categories/:categoryId/budget?year=2026&month=6` → estado del presupuesto (ver formato abajo).

- `GET /api/v1/budgets/status?year=2026&month=6` → estado de **todas** las categorías del usuario:
  ```jsonc
  {
    "data": [
      {
        "categoryId": "uuid",
        "categoryName": "Alimentación",
        "budget": "800000.00",
        "spent": "640000.00",
        "remaining": "160000.00",
        "usagePercent": 80.0,
        "alert": "WARNING_80"           // null | "WARNING_80" | "CRITICAL_100"
      }
    ],
    "meta": null,
    "error": null
  }
  ```

#### Regla de negocio crítica: cálculo de presupuesto consumido + inyección de alertas

**Definición del consumo (`spent`):** suma de `amount` de movimientos `type=EXPENSE` de esa `categoryId`, del `userId` del token, cuyo `occurredAt` cae dentro del **mes calendario** `(year, month)` del presupuesto.

```sql
SELECT COALESCE(SUM(amount), 0)
FROM financial_movements
WHERE user_id = $userId
  AND category_id = $categoryId
  AND type = 'EXPENSE'
  AND occurred_at >= make_date($year, $month, 1)
  AND occurred_at <  (make_date($year, $month, 1) + interval '1 month');
```

**Cálculo de porcentaje y alerta (dominio puro, `Decimal`):**

```typescript
// budget-status.service.ts (domain)
export type BudgetAlert = 'WARNING_80' | 'CRITICAL_100' | null;

export function evaluateBudget(spent: Decimal, budget: Decimal) {
  if (budget.lte(0)) return { usagePercent: 0, alert: null as BudgetAlert };
  const usage = spent.div(budget).mul(100);           // Decimal
  const usagePercent = Number(usage.toFixed(2));
  let alert: BudgetAlert = null;
  if (usage.gte(100)) alert = 'CRITICAL_100';
  else if (usage.gte(80)) alert = 'WARNING_80';
  return { usagePercent, alert, remaining: budget.minus(spent) };
}
```

**Estrategia de cálculo e inyección (síncrona para el MVP):**

1. **Lectura (`GET .../budget`, `/budgets/status`):** cálculo **síncrono** on-the-fly con la agregación SQL anterior. Es exacto y barato gracias al índice `[userId, categoryId, occurredAt]`. **No se cachea** el consumo para evitar inconsistencias en datos financieros.

2. **Escritura que afecta presupuesto (`POST`/`PATCH` de un EXPENSE con `categoryId` presupuestado):** tras persistir el movimiento **en la misma transacción**, recalcular el consumo del mes del movimiento y **adjuntar la alerta en `meta`** de la respuesta de creación/edición:

   ```jsonc
   // Respuesta 201 de POST /movements (EXPENSE en categoría con presupuesto)
   {
     "data": { "id": "uuid", "type": "EXPENSE", "amount": "150000.00", "categoryId": "uuid", "...": "..." },
     "meta": {
       "budgetAlerts": [
         {
           "categoryId": "uuid",
           "categoryName": "Alimentación",
           "budget": "800000.00",
           "spent": "820000.00",
           "usagePercent": 102.5,
           "alert": "CRITICAL_100"
         }
       ]
     },
     "error": null
   }
   ```

   - Si `usage ≥ 100` → `meta.budgetAlerts[].alert = "CRITICAL_100"`.
   - Si `80 ≤ usage < 100` → `"WARNING_80"`.
   - Si `usage < 80` o no hay presupuesto definido → **no** se añade entrada (o `meta.budgetAlerts: []`).

3. **Asíncrono (futuro, documentado pero no obligatorio en MVP):** publicar evento `MovementCreated` a una cola (BullMQ/Redis) para notificaciones push/email cuando se crucen umbrales. El MVP solo inyecta alertas en la respuesta API (cumple el requisito del Módulo 3).

> **Idempotencia de umbrales:** la alerta refleja el estado **actual acumulado** del mes tras la operación, no un evento de "cruce". Esto es determinista y testeable.

---

## 5. Testing & Quality Assurance Strategy

### 5.1 Herramientas y cobertura

- **Backend:** Jest (unit + integración) + Supertest (e2e HTTP). Integración/e2e contra **PostgreSQL real** (contenedor de test o `testcontainers`), **nunca mocks de BD para datos de negocio**.
- **Frontend:** Vitest + Testing Library para componentes/hooks; mock de red con MSW.
- **Cobertura mínima exigida (bloqueante en CI):** **≥ 80%** global de líneas/branches en backend; **≥ 90%** en la capa de dominio (`Money` VO, `evaluateBudget`, balance). El umbral se configura en `jest.config.ts` (`coverageThreshold`) y falla el pipeline si no se cumple.

```typescript
// jest.config.ts (extracto)
coverageThreshold: {
  global: { lines: 80, branches: 75, functions: 80, statements: 80 },
  './src/**/domain/**': { lines: 90, branches: 85 },
},
```

### 5.2 Escenarios críticos obligatorios

**Unitarios (dominio):**
1. `Money` VO: suma/resta/comparación sin pérdida de precisión; rechaza > 2 decimales y negativos.
2. `evaluateBudget`: 79.9% → `null`; 80% exacto → `WARNING_80`; 99.9% → `WARNING_80`; 100% exacto → `CRITICAL_100`; 150% → `CRITICAL_100`; presupuesto 0 → `null`.
3. Balance: ingresos − egresos con decimales (`3200000.00 - 1850000.00 = 1350000.00`).

**Integración / e2e (con BD real):**
4. **Registro de egreso que detona alerta:** crear categoría con presupuesto 800000; registrar egresos hasta 640000 → `meta.budgetAlerts` con `WARNING_80`; registrar hasta 820000 → `CRITICAL_100`.
5. **Aislamiento (test de seguridad bloqueante):** usuario A crea movimiento; usuario B (token válido propio) intenta `GET/PATCH/DELETE /movements/:idDeA` → **404** en todos los casos; B nunca ve datos de A en listados.
6. **Inyección de `userId`:** intentar enviar `userId` en el body → ignorado (whitelist) o 400; el movimiento se asocia al usuario del token, no al del body.
7. **Auth:** login con credenciales malas → 401 genérico; access token expirado → 401; refresh rotativo; reuso de refresh → revocación.
8. **Validación:** `amount` negativo/cero/3 decimales → 400; `month=13` → 400; `startDate > endDate` → 400.
9. **Paginación/orden/filtros:** verificar `totalPages`, orden por fecha desc, filtro combinado `type+categoryId+rango`.
10. **Balance por periodo:** suma correcta dentro del rango y exclusión fuera de rango.

---

## 6. DevOps & CI/CD Pipeline Skeleton

### 6.1 Docker Compose (arranque de un solo comando)

`docker-compose up --build` debe levantar **BD con persistencia real (volumen)**, **backend** y **frontend** comunicados por variables de entorno.

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data        # persistencia real
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./apps/backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      ACCESS_TOKEN_TTL: "900"
      REFRESH_TOKEN_TTL: "604800"
      FRONTEND_URL: http://localhost:3000
    # migraciones + seed antes de arrancar
    command: sh -c "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/main.js"
    ports:
      - "4000:4000"

  frontend:
    build:
      context: ./apps/frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000/api/v1
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

`.env.example` (normativo — el README documenta usuario/clave por defecto del seed):
```dotenv
POSTGRES_USER=fintech
POSTGRES_PASSWORD=change_me_in_prod
POSTGRES_DB=fintech_movements
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
# Seed user (documentar en README): demo@fintech.co / Demo1234!
```

Dockerfiles **multi-stage** (build → runtime slim, usuario no-root). Backend expone `4000`, frontend `3000`.

### 6.2 GitHub Actions — pipeline CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  quality-and-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: fintech
          POSTGRES_PASSWORD: fintech
          POSTGRES_DB: fintech_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U fintech"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://fintech:fintech@localhost:5432/fintech_test?schema=public
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: "20.18.x", cache: "pnpm" }

      - run: pnpm install --frozen-lockfile

      # 1. Lint (bloqueante)
      - name: Lint
        run: pnpm -r lint

      # 2. Type check
      - name: Typecheck
        run: pnpm -r typecheck

      # 3. Migraciones + tests (unit, integración, e2e) con cobertura
      - name: Prisma migrate
        run: pnpm --filter backend exec prisma migrate deploy
      - name: Test (con coverage threshold bloqueante)
        run: pnpm -r test:cov

      # 4. Análisis de calidad estática (SonarCloud)
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@v2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-images:
    needs: quality-and-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build backend image
        run: docker build -t fintech-backend ./apps/backend
      - name: Build frontend image
        run: docker build -t fintech-frontend ./apps/frontend
      # (opcional) push a registry + deploy a la URL del README
```

**Gates bloqueantes:** lint, typecheck, cobertura mínima y Sonar Quality Gate. Un fallo en cualquiera detiene el merge a `main`.

---

## 7. AI Usage Log Template

> Sección **obligatoria** del entregable (peso específico en la evaluación, carácter bloqueante).
> El humano responsable debe completar cada tabla. El agente de IA **no debe inventar**
> contenido aquí: deja los marcadores `[...]` para que el desarrollador los llene con
> evidencia real. Esta sección se replica/resume en el `README.md` bajo "AI Usage".

### 7.1 Herramientas de IA utilizadas

| Herramienta | Versión / Modelo | Tareas específicas para las que se usó |
|-------------|------------------|----------------------------------------|
| [Claude / Cursor / Copilot ...] | [...] | [Ej.: scaffolding de módulos, redacción de tests, revisión de seguridad] |
| [...] | [...] | [...] |

### 7.2 Ejemplos concretos (mínimo 2): qué se pidió y qué se obtuvo

| # | Prompt (qué le pediste a la IA) | Respuesta / artefacto obtenido | ¿Se usó tal cual? |
|---|---------------------------------|--------------------------------|-------------------|
| 1 | [...] | [...] | [Sí / Con cambios] |
| 2 | [...] | [...] | [Sí / Con cambios] |

### 7.3 Sugerencias de IA modificadas o rechazadas (mínimo 1)

| # | Sugerencia de la IA | Decisión humana (modificado/rechazado) | Razón técnica |
|---|---------------------|-----------------------------------------|---------------|
| 1 | [Ej.: "usar `float` para amount"] | Rechazado | Pérdida de precisión IEEE-754 en dinero; se usa `NUMERIC(18,2)` / `Decimal` |
| 2 | [...] | [...] | [...] |

### 7.4 Decisiones de arquitectura modificadas por el humano

| Área | Propuesta original (IA o spec) | Decisión final humana | Justificación |
|------|--------------------------------|------------------------|----------------|
| [Auth / DB / Estructura ...] | [...] | [...] | [...] |

### 7.5 Valoración del impacto de la IA

> [Texto libre: cómo el uso de IA afectó la **calidad** y la **velocidad** del desarrollo;
> dónde aportó valor y dónde requirió criterio humano para corregir el rumbo.]

---

### Apéndice A — Checklist de cumplimiento de restricciones innegociables

- [ ] Persistencia real (PostgreSQL), sin mocks/memoria para datos de negocio.
- [ ] Aislamiento estricto por `userId` del token en las 3 capas (app, repo, BD).
- [ ] Contraseñas con Argon2id/Bcrypt; nunca en texto plano ni logueadas.
- [ ] JWT firma robusta + cookies HTTP-Only/Secure/SameSite + expiración corta.
- [ ] Dinero con `NUMERIC`/`Decimal`, jamás `float`/`double`.
- [ ] Alertas `WARNING_80`/`CRITICAL_100` inyectadas en `meta` de la API.
- [ ] Tests con cobertura ≥ 80% (≥ 90% dominio) y escenarios de seguridad.
- [ ] `docker-compose up --build` levanta BD+backend+frontend de un solo comando.
- [ ] Pipeline CI/CD con lint + análisis estático + tests bloqueantes.
- [ ] README con versiones exactas, credenciales por defecto, justificación de stack y AI Usage.
- [ ] Historial de Git con commits atómicos y descriptivos.
```
