# CLAUDE.md

This file gives Claude Code (claude.ai/code) the context it needs to work effectively in this repository.

## Project

Orderspace is a multi-tenant **order management backend API** built with NestJS 11, Prisma 7, and PostgreSQL. Many organizations share one deployment but are fully isolated from each other. Each organization manages its own categories, products, inventory, customers, and orders, along with memberships, invitations, attachments, notifications, and an immutable audit log. There is no frontend in this repository.

Owner and maintainer: Stephen P. Joseph (`engineerjsp`). The software is proprietary.

## Commands

The package manager is **pnpm**. Do not use npm or yarn.

```bash
pnpm start:dev          # run with watch
pnpm build              # nest build -> dist/
pnpm type-check         # tsc --noEmit (run after every change, CI enforces it)
pnpm lint               # eslint --fix over {src,apps,libs,test}
pnpm format             # prettier --write src

pnpm test               # jest unit tests (*.spec.ts under src/)
pnpm test:watch
pnpm test:cov
pnpm test:e2e           # jest with test/jest-e2e.json

# run one test file
pnpm test -- src/modules/orders/orders.service.spec.ts
# run tests matching a name
pnpm test -- -t "should reject an illegal status transition"

pnpm prisma:generate    # regenerate client into src/generated/prisma (REQUIRED after schema edits)
pnpm prisma:migrate     # prisma migrate dev
pnpm prisma:db:seed     # run the seed script
pnpm prisma:studio      # open Prisma Studio
pnpm test:resend        # send a test email to verify Resend credentials
```

CI (`.github/workflows/ci.yml`) runs on Node 22 and gates pull requests into `main` and `dev` with: prisma generate, type-check, lint, build. Make all four pass locally before pushing. Husky runs pre-commit checks.

## Architecture

### Request pipeline

Wired in `src/main.ts` and `src/app.module.ts`:

Helmet, then CORS, then **ValidationPipe** (`whitelist`, `forbidNonWhitelisted`, `transform`), then the global **ThrottlerGuard**, then the global **JwtAuthGuard**, then route guards, then the controller. The **TransformInterceptor** wraps every response as `{ data, meta: { timestamp } }`, and the **GlobalExceptionFilter** normalizes errors. All routes live under the `/api` prefix. Swagger is served at `/api/docs`.

### Auth and authorization (the heart of multi-tenancy)

Read `src/common/guards/` first.

- **`JwtAuthGuard`** is registered globally with `APP_GUARD`. Every route needs a valid JWT unless it is marked `@Public()`. It attaches the decoded `JwtPayload` to `request.user`.
- **`OrgMemberGuard`** and **`RolesGuard`** are applied per controller or route with `@UseGuards(...)`. Both resolve the organization, then verify the user's `Membership` in it. The `SUPER_ADMIN` global role bypasses both.
- **Organization resolution** is shared by both guards: it uses `:orgId` when present, else `:orderId` (looked up through the Order), else a generic `:id` treated as an organization ID. Resolved values are stored on the request for downstream use by the audit interceptor. When you add a route with a new parameter shape, extend this resolution logic.
- **Roles** are hierarchical: `OWNER(4) > ADMIN(3) > MEMBER(2) > VIEWER(1)`. `@Roles(...)` sets the minimum required role, and access needs a membership role level at or above it.

### Audit logging (decorator driven, opt-in)

Annotate a controller method with `@AuditLog({ entity: 'Order' })`. The `AuditLogInterceptor` in `src/common/interceptors/audit-log.interceptor.ts` then infers the action from the HTTP method, takes a **before** snapshot for mutating requests by resolving the Prisma model delegate from the entity name, takes the **after** snapshot from the response, strips sensitive fields (`password`, `token`, `refreshToken`), and writes the log **fire and forget**, so it never blocks or fails the response.

### Modules (`src/modules/*`)

Each feature is a standard Nest module with `*.module.ts`, `*.controller.ts`, `*.service.ts`, a `dto/` folder, and an `entities/` folder. Modules: `auth`, `users`, `organizations`, `memberships`, `invitations`, `categories`, `products`, `inventory`, `customers`, `orders`, `attachments`, `notifications`, `audit-logs`, `email`, `cron`.

Controllers stay thin: Swagger decorators, guards, and DTO binding. Business logic and all Prisma access live in services.

- **`orders`**: owns the status state machine. Illegal transitions must be rejected. Every transition writes an `OrderStatusHistory` row. Confirming an order decrements stock and cancelling restores it, inside a single transaction.
- **`inventory`**: stock only changes through `InventoryAdjustment` records, so the quantity on a product is always explainable.
- **`cron`** (`@nestjs/schedule`): invitation expiry, low-stock alerts, stale pending orders, and token cleanup, in `src/modules/cron/jobs/`.
- **`email`**: transactional email through Resend.
- **`attachments`**: uploads go through UploadThing. The route handler is mounted directly on the Express instance in `main.ts` at `/api/uploadthing`, **outside** the Nest router.
- **`notifications`**: in-app notifications plus real-time delivery over Server-Sent Events.

### Data layer

- The schema is `prisma/schema.prisma`. Prisma connects to PostgreSQL through the `@prisma/adapter-pg` driver adapter. Prisma configuration lives in `prisma.config.ts`, not in `package.json`.
- **The generated client is committed at `src/generated/prisma/`.** Import enums from `src/generated/prisma/enums` and models from `src/generated/prisma/models`. Re-run `pnpm prisma:generate` after any schema change, or builds and types will be stale.
- `PrismaService` in `src/database/` is the injectable client. Inject it into services.
- **Money** uses `Decimal`. Never use floats for prices or totals. Order items store a **price snapshot** so historical orders never change.
- **Order numbers** are sequential per organization and allocated inside a transaction.
- **SKU** is unique per organization through a composite unique index, not globally.
- **Soft deletes**: organizations, products, customers, and orders use a `deletedAt` column. Reads must filter `deletedAt: null`. Follow the existing pattern instead of hard deleting.

### Config

Typed configuration uses `@nestjs/config` `registerAs` factories in `src/config/` (`app`, `database`, `jwt`, `resend`, `throttler`), loaded globally in `app.module.ts`, and read with `configService.get<XConfig>('x')`. The helpers `requireEnv` and `optionalEnv` are in `src/config/env.ts`. See `.env.example` for the required variables.

## Conventions

- Match the formatting rules in `.prettierrc` and `eslint.config.mjs`, and run `pnpm format` and `pnpm lint` before finishing.
- TypeScript strict mode. Avoid `any`.
- New endpoints must carry Swagger decorators (`@ApiTags`, `@ApiOperation`, response decorators). The live docs are generated from them.
- Mark unauthenticated routes with `@Public()`, read the current user with `@CurrentUser()`, protect tenant routes with `OrgMemberGuard` and `RolesGuard`, and audit mutations with `@AuditLog()`.
- Every query on tenant data must be scoped by organization.
- Use Conventional Commits. Work from `dev`, open pull requests into `dev`, and merge `dev` into `main` only for releases.
- Never commit `.env` files or secrets.