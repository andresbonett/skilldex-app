# SkillDex MVP - Dashboard de Búsqueda de Empleo con IA

## Stack y decisiones
- **Framework**: Next.js (App Router) + TypeScript, Tailwind CSS.
- **UI**: shadcn/ui sobre Tailwind (componentes accesibles para Kanban/listas).
- **DB**: SQLite local (`dev.db`) via Drizzle ORM + `@libsql/client`.
- **Auth**: sin auth; `userId = "user-local"` constante en todas las consultas.
- **IA**: Vercel AI SDK (`ai`) agnóstico. Default `google('gemini-3.5-flash')`; alternables DeepSeek y OpenRouter via `@ai-sdk/openai` (`createOpenAI` con `baseURL` custom).
- **Gestor de paquetes**: npm.

## Ejecución por fases
El trabajo se ejecuta por fases, deteniéndose tras cada una para aprobación antes de continuar.

| Fase | Estado |
|------|--------|
| 1. Setup + DB (Drizzle + SQLite) | Completada |
| 2. Motor de extracción IA multi-modelo | Completada |
| 3. Dashboard (Kanban + lista de habilidades) | Completada |
| 4. Alertas y módulo de CV ATS | Completada |

---

## FASE 1: Setup del proyecto + Base de datos (Drizzle + SQLite)

### 1. Scaffold e instalación
- `npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"`.
- Dependencias: `drizzle-orm @libsql/client ai @ai-sdk/google @ai-sdk/openai zod lucide-react`.
- Dev: `drizzle-kit dotenv`.
- Inicializar shadcn/ui + componentes base (`button`, `card`, `input`, `textarea`, `checkbox`, `select`, `badge`, `dialog`).

### 2. Conexión DB y migraciones
- `drizzle.config.ts` (dialect `sqlite`, `dbCredentials.url = file:./dev.db`, `out: ./drizzle`).
- `src/db/index.ts`: cliente libSQL + `drizzle()`.
- `src/lib/constants.ts`: `export const LOCAL_USER_ID = "user-local"`.

### 3. Esquema `src/db/schema.ts`
- `jobs`: `id`, `userId`, `cargo`, `empresa`, `urlOriginal`, `textoVacante`, `estadoPostulacion` (`Por postular` | `Postulado` | `Entrevista` | `Rechazado`, default `Por postular`), `fechaCreacion`.
- `skillsTracker`: `id`, `userId`, `nombreHabilidad`, `tipo` (`tecnica` | `blanda` | `requisito`), `completada` (booleano), `frecuencia` (entero).
- `jobSkillsRelation`: tabla intermedia para conectar habilidades con vacantes.
- `userSettings`: `id`, `userId`, `proveedorIAFavorito`, `modeloIAFavorito`.
- Nota: SQLite no tiene enums nativos; se modelan como `text` con `{ enum: [...] }` de Drizzle.

### 4. Migración
- Scripts npm: `db:generate`, `db:migrate`, `db:studio`.
- Ejecutar `db:generate` + `db:migrate` para crear `dev.db`.

### Estructura de archivos (tras Fase 1)
```text
skilldex-app/
├─ drizzle/                 # migraciones SQL generadas
├─ drizzle.config.ts
├─ dev.db                   # SQLite local (generado, gitignored)
├─ docs/PLAN.md             # este plan
├─ .env.local               # claves IA (Fase 2)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx           # dashboard (Fase 3)
│  │  └─ globals.css
│  ├─ components/ui/        # shadcn
│  ├─ db/
│  │  ├─ index.ts
│  │  └─ schema.ts
│  └─ lib/
│     ├─ constants.ts
│     └─ utils.ts
├─ package.json
└─ tsconfig.json
```

---

## FASE 2: Motor de extracción IA multi-modelo

- `.env.local` con `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY` (+ `.env.example`).
- `src/lib/ai/models.ts`: fábrica `getModel(provider, model)` con switch:
  - `google` → `google('gemini-2.5-flash')` (default).
  - `deepseek` → `createOpenAI({ baseURL: 'https://api.deepseek.com', apiKey })`.
  - `openrouter` → `createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })`.
- `src/lib/ai/schema.ts`: Zod estricto → `cargo`, `empresa`, `habilidadesRequeridas: string[]`, `experienciaRequerida`, `requisitosClave: string[]`.
- Server Action `src/app/actions/process-job.ts` con `generateObject({ model, schema, prompt })`.
- Lógica DB transaccional: insertar `job`; por cada habilidad, upsert en `skillsTracker` (si existe → `frecuencia += 1`, si no → crear con `frecuencia = 1`); vincular en `jobSkillsRelation`.

---

## FASE 3: Dashboard (Kanban + lista de habilidades)

- `src/app/page.tsx` dividido en dos secciones (Server Components + Client donde haga falta).
- **Habilidades**: agrupadas en "Pendientes por aprender" (ordenadas por `frecuencia` desc) y "Ya poseo"; checkbox para marcar `completada` (Server Action).
- **Kanban**: columnas `Por postular`, `Postulado`, `Entrevista` con tarjetas de `jobs`.
- Formulario con `textarea` (pegar vacante) + `select` de proveedor/modelo IA que dispara la Server Action de Fase 2.

---

## FASE 4: Alertas y módulo de CV ATS

Estado: **Completada**.

### Alertas (Kanban)
- Badge **¡Perfil Listo! Contactar Empresa** cuando todas las skills del job están `completada`.
- Modal **Prompt CV externo** por tarjeta: genera un prompt (CV JSON + skills + oferta) para copiar a un chat externo.

### Módulo `/cv`
- Un CV activo por `user-local` + historial de versiones (`resumes` / `resume_versions`), sin `jobId`.
- Seed inicial: CV ATS de Andrés Felipe Bonett Maldonado.
- Editor por secciones + import/export JSON + preview ATS (plantilla HTML) + PDF (`@react-pdf/renderer`).
- IA interna: revisión ATS y **optimización por cobertura de skills de mercado** (`scorePrioridad` / tracker), no por oferta.
- Panel **A qué jobs enviar**: ranking determinista de match CV ↔ skills del job.

Archivos clave: `src/app/cv/page.tsx`, `src/app/actions/resume.ts`, `src/lib/cv/*`, `src/components/cv/*`.

---

## Riesgos / notas
- Enums en SQLite se emulan con `text({ enum })`.
- Claves de IA quedan como placeholders en `.env.local`; hay que rellenarlas antes de probar Fase 2.
