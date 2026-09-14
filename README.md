# FinanzasPro v2

Aplicación de finanzas personales construida con **Next.js 15 (App Router) + TypeScript + PostgreSQL**, desplegada en **Railway**.

Reemplaza a la versión v1 basada en Firebase (código preservado en la rama `legacy/firebase-v1`).

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 · React 19 · TypeScript strict |
| Base de datos | PostgreSQL + Prisma ORM |
| Auth | JWT firmado con `jose` (cookie httpOnly) + bcrypt |
| UI | Tailwind CSS v4 · Recharts · lucide-react · SWR |
| PWA | manifest + service worker |

## Estructura

```
prisma/schema.prisma        # Modelo de datos completo
src/app/api/                # Backend: route handlers REST
src/app/(auth)/             # Login y registro
src/app/(app)/              # Vistas autenticadas (dashboard, movimientos, etc.)
src/lib/                    # auth, validaciones zod, ciclo, insights, helpers server
```

## Desarrollo local

```bash
cp .env.example .env          # completa DATABASE_URL y AUTH_SECRET
npm install
npx prisma migrate deploy     # crea el schema
npm run dev                   # http://localhost:3000
```

> El **primer usuario que se registre queda como ADMIN** automáticamente.
> Los siguientes usuarios requieren aprobación de su dispositivo desde el panel Admin.

### Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye `prisma generate`) |
| `npm run lint` | ESLint (0 warnings permitidos) |
| `npm run typecheck` | TypeScript strict |
| `npm run db:migrate` | Aplica migraciones (`prisma migrate deploy`) |
| `npm run db:studio` | Prisma Studio (inspección de datos) |

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Railway la inyecta al vincular el servicio) |
| `AUTH_SECRET` | Secreto para firmar sesiones JWT (mín. 16 chars). Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |

## Modelo de autorización

1. Login con **email + contraseña**; el navegador envía un `deviceId` estable guardado en localStorage.
2. Todo dispositivo nuevo queda **PENDING**: puede iniciar sesión pero solo ve la pantalla "pendiente de aprobación".
3. Un **ADMIN aprueba/bloquea/elimina dispositivos** desde `/admin`.
4. Los dispositivos de administradores se activan solos.
5. Todas las APIs de datos exigen sesión válida **y** dispositivo ACTIVE (los ADMIN pueden pasar siempre).

## Alertas de presupuesto

Al registrar un gasto, el servidor calcula si el total del ciclo supera el **90% del salario** configurado; si cruza el umbral, registra un evento `BUDGET_ALERT` en auditoría y el dashboard muestra una alerta.

## Análisis inteligente

Motor de reglas locales (`src/lib/insights.ts`): tasa de ahorro, consumo del presupuesto, categoría dominante, peso de suscripciones y hábito de registro. Sin servicios externos ni costos por uso.

## Deploy en Railway

1. Crear proyecto → **+ New → Database → PostgreSQL**.
2. **+ New → GitHub Repo** → seleccionar este repositorio (rama `main`).
3. En el servicio web, variables:
   - `AUTH_SECRET` (generar valor aleatorio)
   - `DATABASE_URL` ya disponible vía referencia `${{Postgres.DATABASE_URL}}`
4. Build command (detecta Nixpacks): `npx prisma generate && npx next build`
   Start command: `npx prisma migrate deploy && npx next start -p $PORT`
   (o usar `railway.toml` incluido)
5. Generate Domain para exponer la app.

## Buenas prácticas implementadas

- Validación de entrada con **Zod** en todos los endpoints.
- Defensa **anti-IDOR**: todo recurso se filtra por `walletId` del usuario autenticado.
- Movimientos de dinero atómicos (`prisma.$transaction`): saldos nunca quedan inconsistentes.
- Errores HTTP consistentes `{ error: { message, code } }` sin filtrar detalles internos.
- Sesiones en cookies **httpOnly + SameSite=Lax + Secure** en producción.
- Hash bcrypt cost 12; mensajes de login genéricos (no revelan si existe el email).
- Auditoría de acciones sensibles (`audit_logs`).
- Lint estricto (0 warnings) + TypeScript `strict`.
