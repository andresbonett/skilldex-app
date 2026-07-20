---
name: SkillDex MVP
overview: Construir un MVP de dashboard personal de b\u00fasqueda de empleo con Next.js (App Router) + TypeScript, SQLite local via Drizzle ORM/libSQL, extracci\u00f3n de requisitos con Vercel AI SDK (Gemini + DeepSeek/OpenRouter), tablero Kanban de postulaciones y lista priorizada de habilidades. Se ejecuta por fases, deteniendo tras cada una para tu aprobaci\u00f3n.
todos:
  - id: scaffold
    content: "Scaffold Next.js (App Router, TS, Tailwind, src-dir) e instalar deps: drizzle-orm, @libsql/client, ai, @ai-sdk/google, @ai-sdk/openai, zod, lucide-react, drizzle-kit; init shadcn/ui + componentes base"
    status: completed
  - id: db-conn
    content: Crear drizzle.config.ts, src/db/index.ts (cliente libSQL) y src/lib/constants.ts con LOCAL_USER_ID
    status: completed
  - id: schema
    content: "Definir src/db/schema.ts: jobs, skillsTracker, jobSkillsRelation, userSettings con enums via text({enum})"
    status: completed
  - id: migrate
    content: Añadir scripts db:generate/db:migrate/db:studio y ejecutar migración para crear dev.db
    status: completed
isProject: false
---

# SkillDex MVP - Dashboard de Búsqueda de Empleo con IA

## Stack y decisiones
- **Framework**: Next.js 15 (App Router) + TypeScript, Tailwind CSS.
- **UI**: shadcn/ui sobre Tailwind (componentes accesibles para Kanban/listas).
- **DB**: SQLite local (`dev.db`) via Drizzle ORM + `@libsql/client`.
- **Auth**: sin auth; `userId = "user-local"` constante en todas las consultas.
- **IA**: Vercel AI SDK (`ai`) agnóstico. Default `google('gemini-2.5-flash')`; alternables DeepSeek y OpenRouter via `@ai-sdk/openai` (`createOpenAI` con `baseURL` custom).
- **Gestor de paquetes**: npm (pnpm no está instalado).

## Ejecución por fases
El plan cubre las 4 fases, pero **solo se ejecuta la Fase 1 ahora** y me detengo para tu aprobación antes de cada fase siguiente.

---

## FASE 1: Setup del proyecto + Base de datos (a ejecutar ya)

### 1. Scaffold e instalación
- `npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"` (en el dir actual, ya vacío salvo `.git`).
- Dependencias: `drizzle-orm @libsql/client ai @ai-sdk/google @ai-sdk/openai zod lucide-react`.
- Dev: `drizzle-kit dotenv`.
- Inicializar shadcn/ui: `npx shadcn@latest init` + componentes base (`button`, `card`, `input`, `textarea`, `checkbox`, `select`, `badge`, `dialog`).

### 2. Conexión DB y migraciones
- `drizzle.config.ts` (dialect `sqlite`, `dbCredentials.url = file:./dev.db`, `out: ./drizzle`).
- `src/db/index.ts`: cliente libSQL + `drizzle()`.
- `src/lib/constants.ts`: `export const LOCAL_USER_ID = "user-local"`.

### 3. Esquema `src/db/schema.ts`
- `jobs`: `id`, `userId`, `cargo`, `empresa`, `urlOriginal`, `textoVacante`, `estadoPostulacion` (`Por postular` | `Postulado` | `Entrevista` | `Rechazado`, default `Por postular`), `fechaCreacion`.
- `skillsTracker`: `id`, `userId`, `nombreHabilidad`, `tipo` (`tecnica` | `blanda` | `requisito`), `completada` (bool, default false), `frecuencia` (int, default 1).
- `jobSkillsRelation`: intermedia (`jobId`, `skillId`) con PK compuesta y FKs.
- `userSettings`: `id`, `userId`, `proveedorIAFavorito`, `modeloIAFavorito`.
- Nota: SQLite no tiene enums nativos; se modelan como `text` con `{ enum: [...] }` de Drizzle para tipado estricto.

### 4. Migración
- Añadir scripts npm: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `db:studio`.
- Ejecutar `db:generate` + `db:migrate` para crear `dev.db`.

### Estructura de archivos propuesta (tras Fase 1)
```text
skilldex-app/
├─ drizzle/                 # migraciones SQL generadas
├─ drizzle.config.ts
├─ dev.db                   # SQLite local (generado)
├─ .env.local              # claves IA (Fase 2)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx           # dashboard (Fase 3)
│  │  └─ globals.css
│  ├─ components/ui/        # shadcn
│  ├─ db/
│  │  ├─ index.ts           # conexión
│  │  └─ schema.ts          # tablas Drizzle
│  ├─ lib/
│  │  ├─ constants.ts       # LOCAL_USER_ID
│  │  └─ utils.ts           # (shadcn cn)
│  └─ ...
├─ package.json
└─ tsconfig.json
```

**PARADA 1**: te muestro estructura final, esquema y `dev.db` creado. Espero aprobación.

---

## FASE 2: Motor de extracción IA multi-modelo

- `.env.local` con `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY` (+ `.env.example`).
- `src/lib/ai/models.ts`: fábrica `getModel(provider, model)` con switch:
  - `google` → `google('gemini-2.5-flash')` (default).
  - `deepseek` → `createOpenAI({ baseURL: 'https://api.deepseek.com', apiKey })`.
  - `openrouter` → `createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })`.
- `src/lib/ai/schema.ts`: Zod estricto → `cargo`, `empresa`, `habilidadesRequeridas: string[]`, `experienciaRequerida`, `requisitosClave: string[]`.
- Server Action `src/app/actions/process-job.ts` con `generateObject({ model, schema, prompt })`.
- Lógica DB transaccional: insertar `job`; por cada habilidad, `upsert` en `skillsTracker` (si existe → `frecuencia += 1`, si no → crear con `frecuencia = 1`); vincular en `jobSkillsRelation`.

**PARADA 2**: aprobación.

---

## FASE 3: Dashboard (Kanban + lista de habilidades)

- `src/app/page.tsx` dividido en dos secciones (Server Components + Client donde haga falta).
- **Habilidades**: agrupadas en "Pendientes por aprender" (ordenadas por `frecuencia` desc) y "Ya poseo"; checkbox para marcar `completada` (Server Action).
- **Kanban**: columnas `Por postular`, `Postulado`, `Entrevista` con tarjetas de `jobs`.
- Formulario con `textarea` (pegar vacante) + `select` de proveedor/modelo IA que dispara la Server Action de Fase 2.

**PARADA 3**: aprobación.

---

## FASE 4: Alertas y utilidades de CV

- Función que verifica si todas las skills vinculadas a un job están `completada = true` → badge "¡Perfil Listo! Contactar Empresa" en la tarjeta.
- Modal/panel lateral que genera un prompt optimizado (a partir de las skills en DB) para copiar y usar en un chat externo (cartas de presentación / adaptar CV).

**PARADA 4**: entrega final.

## Riesgos / notas
- `create-next-app` y `shadcn init` requieren red (npm registry) — permisos de red al ejecutar.
- Enums en SQLite se emulan con `text({ enum })`; se documenta.
- Claves de IA quedan como placeholders en `.env.local`; tú las rellenas antes de probar Fase 2.