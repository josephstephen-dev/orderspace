# 📦 Orderspace

**One backend. Many businesses. Every order accounted for.**

A multi-tenant **order management API** built on NestJS, Prisma, and PostgreSQL. Each organization gets its own isolated workspace, team, notifications, and audit trail.

<br />

[![CI](https://github.com/josephstephen-dev/orderspace/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/josephstephen-dev/orderspace/actions/workflows/ci.yml)

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-not%20pinned-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.11.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-B91C1C?style=for-the-badge)

![Orderspace Swagger UI — Organizations](assets/docs/swagger-organizations.png)

*Swagger UI preview. The `/api/docs` route must be disabled in production and available only in non-production environments.*

[Live Demo](#-live-demo) · [Status](#-project-status) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Configuration](#-configuration) · [Roadmap](#-roadmap) · [Contact](#-maintainer)

---

## 📑 Contents

1. [At a Glance](#-at-a-glance)

2. [Live Demo](#-live-demo)

3. [Project Status](#-project-status)

4. [Why Orderspace](#-why-orderspace)

5. [Quick Start](#-quick-start)

6. [Architecture](#-architecture)

7. [Domain Model](#-domain-model)

8. [API Conventions](#-api-conventions)

9. [API Walkthrough](#-api-walkthrough)

10. [API Reference](#-api-reference)

11. [Configuration](#-configuration)

12. [Project Layout](#-project-layout)

13. [Engineering Standards](#-engineering-standards)

14. [Security Model](#-security-model)

15. [Background Jobs](#-background-jobs)

16. [Transactional Email](#-transactional-email)

17. [Deployment](#-deployment)

18. [Roadmap](#-roadmap)

19. [Troubleshooting](#-troubleshooting)

20. [Contributing](#-contributing)

21. [Maintainer](#-maintainer)

22. [License](#-license)

---

## ⚡ At a Glance

| | |
|---|---|
| **What it is** | A REST API backend with no bundled frontend |
| **Tenancy model** | Shared database, shared schema, organization-scoped rows |
| **Roles** | Four organization roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) plus a global `SUPER_ADMIN` |
| **Built today** | Auth, organizations, memberships, invitations, order notes, attachments, notifications, audit log, email, scheduled jobs |
| **Planned** | Product catalog, customers, inventory, and the order pipeline (see [Roadmap](#-roadmap)) |
| **Realtime** | Server-Sent Events for in-app notifications |
| **Auth** | Short-lived JWT access tokens, rotating refresh tokens, OTP email verification |
| **Docs** | Swagger UI at `/api/docs` in non-production; production must not mount the docs route |
| **Runs on** | Node.js and PostgreSQL; exact versions are not pinned in `package.json` |
| **Package manager** | pnpm 11.11.0 |

---

## 🌐 Live Demo

A hosted demo is not publicly available. To see Orderspace running live, email [josephstep486@gmail.com](mailto:josephstep486@gmail.com) with your name and organization.

---

## 🚧 Project Status

Orderspace is under active development and is **not yet production-hardened**.

| Area | State |
|---|---|
| Auth, organizations, memberships, invitations | ✅ Implemented |
| Notifications, email, audit log, scheduled jobs | ✅ Implemented |
| Order notes and attachments | ✅ Implemented |
| Catalog, customers, inventory, order pipeline | 🗓️ Planned. Some database models exist, but the API modules are not built yet. |
| Automated tests | ❌ None yet. `pnpm test` passes because it runs with `--passWithNoTests`. |

---

## 🎯 Why Orderspace

Handling orders for many independent businesses means no business ever sees another's data, and there is a trustworthy record of who changed what. Orderspace is built around four commitments:

| Principle | What it means in practice |
|---|---|
| **Isolation first** | Guards verify organization membership before a controller runs, and tenant data is scoped by organization. |
| **Never lose history** | Changes are written to an audit log with before and after states. |
| **Predictable API** | One response envelope, one error shape, one auth model. |
| **Documented by default** | Swagger docs are generated from the same decorators that protect the routes. |

---

## 🚀 Quick Start

**Prerequisites:** Node.js (use a version compatible with the NestJS 11 toolchain; `package.json` does not pin a Node.js version), Docker (for PostgreSQL), and a free [Resend](https://resend.com) account if you want to test email.

```bash

# 1. Get the code

git clone https://github.com/josephstephen-dev/orderspace.git

cd orderspace

# 2. Enable the pinned package manager and install

corepack enable

pnpm install

# 3. Configure the environment

cp .env.example .env          # on Windows PowerShell: Copy-Item .env.example .env

# 4. Start PostgreSQL

docker compose up -d

# 5. Generate the Prisma client and apply migrations

pnpm prisma:generate

pnpm prisma:migrate:deploy

# 6. Run the API in watch mode

pnpm start:dev

```

Then open:

| URL | What you get |
|---|---|
| `http://localhost:3000/api` | Health check |
| `http://localhost:3000/api/docs` | Swagger UI (development/test only; production should return `404`) |

> **Tip:** if verification emails never arrive locally, check that `RESEND_API_KEY` is set. See [Troubleshooting](#-troubleshooting).

---

## 🏗️ Architecture

### System layers

```mermaid

flowchart TB

    subgraph Clients

        direction LR

        WEB["Web app"]

        MOB["Mobile app"]

        INT["Integrations"]

    end

    subgraph Edge["Edge: applied to every request"]

        direction LR

        H["Helmet"] --> CO["CORS"] --> TH["Throttler"] --> VP["ValidationPipe"]

    end

    subgraph Access["Access control"]

        direction LR

        JG["JwtAuthGuard"] --> OG["OrgMemberGuard"] --> RG["RolesGuard"]

    end

    subgraph Domain["Implemented modules"]

        direction LR

        M1["auth"]

        M2["organizations"]

        M3["memberships"]

        M4["invitations"]

        M5["order-notes"]

        M6["attachments"]

        M7["notifications"]

        M8["audit-logs"]

    end

    subgraph Platform["Platform services"]

        direction LR

        PR["PrismaService"]

        EM["Email service"]

        CR["Cron jobs"]

    end

    subgraph External["External systems"]

        direction LR

        PG[("PostgreSQL")]

        RS["Resend"]

        UT["UploadThing"]

    end

    Clients --> Edge --> Access --> Domain --> Platform

    PR --> PG

    EM --> RS

    M6 --> UT

```

### How the tenant is resolved

Most routes carry the organization in the URL. A few nested routes only carry a child ID, so the guard walks up to the owning organization before checking membership.

```mermaid

flowchart TD

    A["Incoming request"] --> B{"Route is @Public?"}

    B -- yes --> Z["Skip access checks"]

    B -- no --> C["Verify JWT, attach user"]

    C --> D{"Global role is SUPER_ADMIN?"}

    D -- yes --> Y["Allow"]

    D -- no --> E{"URL has :orgId?"}

    E -- yes --> H["orgId resolved"]

    E -- no --> F{"URL has :orderId?"}

    F -- yes --> G["Look up Order, read its organizationId"]

    F -- no --> I["Treat :id as organization ID"]

    G --> H

    I --> H

    H --> J{"Active membership in that organization?"}

    J -- no --> X["403 Forbidden"]

    J -- yes --> K{"Role level at least the route minimum?"}

    K -- no --> X

    K -- yes --> Y

```

### Session and token lifecycle

```mermaid

stateDiagram-v2

    direction LR

    [*] --> Unverified: register

    Unverified --> Verified: valid OTP

    Verified --> Active: login issues token pair

    Active --> Active: refresh rotates both tokens

    Active --> LoggedOut: logout revokes refresh token

    Active --> Revoked: password reset revokes all

    LoggedOut --> Active: login

    Revoked --> Active: login with new password

```

### Roles

```mermaid

flowchart LR

    V["VIEWER<br/>read"] --> M["MEMBER<br/>notes and attachments"] --> A["ADMIN<br/>people, settings, audit"] --> O["OWNER<br/>delete org, transfer ownership"]

    S(["SUPER_ADMIN<br/>platform operator"]) -.-> O

```

| Capability | VIEWER | MEMBER | ADMIN | OWNER |
|---|:---:|:---:|:---:|:---:|
| Read organization data | ✅ | ✅ | ✅ | ✅ |
| Add order notes and attachments | ❌ | ✅ | ✅ | ✅ |
| Update organization settings | ❌ | ❌ | ✅ | ✅ |
| Invite, re-role, and remove members | ❌ | ❌ | ✅ | ✅ |
| Read the audit log | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership or delete the organization | ❌ | ❌ | ❌ | ✅ |

### Notification flow

```mermaid

flowchart LR

    subgraph Sources

        S1["Member joined or removed"]

        S2["Order note added"]

        S3["Low stock job"]

        S4["Stale order job"]

    end

    Sources --> SVC["NotificationsService"]

    SVC --> D1[("Persist in database")]

    SVC --> D2["Push to open SSE streams"]

    SVC --> D3["Email via Resend"]

```

---

## 🗃️ Domain Model

The Prisma schema (`prisma/schema.prisma`) currently defines these models: `User`, `Organization`, `Membership`, `Invitation`, `RefreshToken`, `OtpCode`, `Category`, `Product`, `Customer`, `Order`, `OrderNote`, `Attachment`, `Notification`, and `AuditLog`.

```mermaid

erDiagram

    USER ||--o{ MEMBERSHIP : "belongs through"

    ORGANIZATION ||--o{ MEMBERSHIP : "has"

    ORGANIZATION ||--o{ INVITATION : "issues"

    ORGANIZATION ||--o{ AUDIT_LOG : "records"

    ORGANIZATION ||--o{ CATEGORY : "owns"

    ORGANIZATION ||--o{ PRODUCT : "owns"

    ORGANIZATION ||--o{ CUSTOMER : "owns"

    ORGANIZATION ||--o{ ORDER : "owns"

    ORDER ||--o{ ORDER_NOTE : "has"

    ORDER ||--o{ ATTACHMENT : "has"

    USER ||--o{ REFRESH_TOKEN : "holds"

    USER ||--o{ OTP_CODE : "receives"

    USER ||--o{ NOTIFICATION : "receives"

```

`Category`, `Product`, `Customer`, and `Order` exist in the schema, but their API modules are planned (see [Roadmap](#-roadmap)).

---

## 📐 API Conventions

Every endpoint lives under the `/api` prefix.

### Authentication

```http

Authorization: Bearer <accessToken>

```

Routes marked **Public** need no token.

### Success envelope

```json

{

  "data": { "id": "b6f1c0de-2f0e-4c61-9a52-3d1f6a2c9e10" },

  "meta": { "timestamp": "2026-10-09T09:30:00.000Z" }

}

```

### Error shape

All failures pass through one global exception filter.

```json

{

  "statusCode": 403,

  "error": "Forbidden",

  "message": "You are not a member of this organization",

  "path": "/api/organizations/9c2f.../members",

  "timestamp": "2026-10-09T09:30:00.000Z"

}

```

| Status | Meaning |
|---|---|
| `400` | Validation failed or an unknown field was sent |
| `401` | Missing, expired, or invalid access token |
| `403` | Authenticated, but not a member or role too low |
| `404` | Resource does not exist in this organization |
| `409` | Conflict, such as a duplicate |
| `429` | Rate limit exceeded |

### Pagination

List endpoints accept `page` and `limit`.

### Rate limiting

A global throttler applies to every route. Defaults are `THROTTLE_LIMIT=10` requests per `THROTTLE_TTL=60` seconds, tunable per environment.

### Validation

Request bodies are validated against DTOs with `whitelist` and `forbidNonWhitelisted` enabled, so unknown properties are rejected.

---

## 🧪 API Walkthrough

```bash

BASE=http://localhost:3000/api

# 1. Register and verify (the code arrives by email)

curl -X POST $BASE/auth/register -H "Content-Type: application/json" \

  -d '{"name":"Ada Okafor","email":"ada@example.com","password":"S3cure-Passw0rd!"}'

curl -X POST $BASE/auth/verify-email -H "Content-Type: application/json" \

  -d '{"email":"ada@example.com","code":"123456"}'

# 2. Log in and keep the access token

TOKEN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \

  -d '{"email":"ada@example.com","password":"S3cure-Passw0rd!"}' | jq -r '.data.accessToken')

# 3. Create an organization

ORG=$(curl -s -X POST $BASE/organizations -H "Authorization: Bearer $TOKEN" \

  -H "Content-Type: application/json" -d '{"name":"Lagos Fabrics"}' | jq -r '.data.id')

# 4. Invite a teammate and list members

curl -X POST $BASE/organizations/$ORG/invitations -H "Authorization: Bearer $TOKEN" \

  -H "Content-Type: application/json" -d '{"email":"teammate@example.com","role":"MEMBER"}'

curl $BASE/organizations/$ORG/members -H "Authorization: Bearer $TOKEN"

```

---

## 📚 API Reference

**Min role** is the lowest organization role allowed to call the endpoint. The interactive reference at `/api/docs` is the source of truth in non-production environments.

<details>

<summary><strong>🔐 Authentication</strong></summary>

<br />

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Create an account and send a verification code | Public |
| `POST` | `/auth/verify-email` | Confirm the email with the OTP | Public |
| `POST` | `/auth/resend-verification` | Send a fresh verification code | Public |
| `POST` | `/auth/forgot-password` | Email a password reset code | Public |
| `POST` | `/auth/reset-password` | Set a new password with the code | Public |
| `POST` | `/auth/login` | Exchange credentials for a token pair | Public |
| `POST` | `/auth/refresh` | Rotate the refresh token | Public |
| `POST` | `/auth/logout` | Revoke the refresh token | JWT |
| `GET` | `/auth/me` | Read your profile | JWT |
| `PATCH` | `/auth/me` | Update your profile | JWT |
| `PATCH` | `/auth/me/password` | Change your password | JWT |

</details>

<details>

<summary><strong>🏢 Organizations</strong></summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `POST` | `/organizations` | Create an organization | JWT |
| `GET` | `/organizations` | List yours | JWT |
| `GET` | `/organizations/:id` | Read one | MEMBER |
| `PATCH` | `/organizations/:id` | Update | ADMIN |
| `DELETE` | `/organizations/:id` | Delete | OWNER |
| `PATCH` | `/organizations/:id/transfer` | Transfer ownership | OWNER |

</details>

<details>

<summary><strong>🤝 Memberships and invitations</strong></summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `GET` | `/organizations/:orgId/members` | List members | MEMBER |
| `PATCH` | `/organizations/:orgId/members/:userId` | Change a role | ADMIN |
| `DELETE` | `/organizations/:orgId/members/:userId` | Remove a member | ADMIN |
| `DELETE` | `/organizations/:orgId/members/me` | Leave | MEMBER |
| `POST` | `/organizations/:orgId/invitations` | Send an invitation | ADMIN |
| `GET` | `/organizations/:orgId/invitations` | List invitations | ADMIN |
| `DELETE` | `/organizations/:orgId/invitations/:id` | Revoke | ADMIN |
| `GET` | `/invitations/:token` | Inspect an invitation | Public |
| `POST` | `/invitations/:token/accept` | Accept | JWT |
| `POST` | `/invitations/:token/decline` | Decline | JWT |

</details>

<details>

<summary><strong>📝 Order notes and attachments</strong></summary>

<br />

See `/api/docs` for the exact routes. Notes are scoped to an order inside an organization, and attachments are scoped by order ID. Viewers can read, and members and above can create. File bytes are uploaded through the UploadThing handler, and the attachment endpoints store metadata only.

</details>

<details>

<summary><strong>🔔 Notifications and audit</strong></summary>

<br />

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/notifications` | Paginated inbox | JWT |
| `GET` | `/notifications/unread-count` | Badge count | JWT |
| `GET` | `/notifications/stream` | Live SSE stream | JWT |
| `PATCH` | `/notifications/read-all` | Mark all read | JWT |
| `PATCH` | `/notifications/:id/read` | Mark one read | JWT |
| `DELETE` | `/notifications/:id` | Delete | JWT |
| `GET` | `/organizations/:orgId/audit-logs` | Query the audit trail | ADMIN |

</details>

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in the values. Variables are read through typed config factories in `src/config/`.

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `APP_NAME` | No | `orderspace` | Shown in logs and emails |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test`. The bootstrap must skip Swagger setup in `production`. |
| `CORS_ORIGINS` | No | none | Comma-separated list of allowed origins |
| `DATABASE_URL` | Yes | none | Example: `postgresql://postgres:postgres@localhost:5433/orderspace` |
| `JWT_SECRET` | Yes | none | Signs access tokens |
| `JWT_REFRESH_SECRET` | Yes | none | Signs refresh tokens. Must differ from `JWT_SECRET`. |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `THROTTLE_TTL` | No | `60` | Rate limit window in seconds |
| `THROTTLE_LIMIT` | No | `10` | Requests per window |
| `RESEND_API_KEY` | Yes | none | Email delivery |
| `RESEND_FROM_EMAIL` | No | none | Sender address on a verified domain |
| `RESEND_FROM_NAME` | No | `Orderspace` | Sender display name |
| `UPLOADTHING_TOKEN` | Yes | none | File uploads |

> Generate strong secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

---

## 🗂️ Project Layout

```text

orderspace/

├── .agents/skills/                 AI assistant skills (code review, NestJS, Prisma, project conventions)

├── .github/

│   ├── workflows/ci.yml            CI pipeline

│   ├── dependabot.yml              Dependency updates

│   └── PULL_REQUEST_TEMPLATE.md

├── .husky/pre-commit               Pre-commit hook

├── assets/                         Documentation screenshots (assets/docs/swagger-organizations.png, assets/docs/swagger_audit_log_details.png)

├── prisma/

│   ├── schema.prisma               Source of truth for the data model

│   └── migrations/                 Versioned SQL migrations

├── scripts/test-resend.ts          Sends a test email to verify Resend credentials

├── src/

│   ├── main.ts                     Application entry point

│   ├── app.setup.ts                Global setup (pipes, security, docs)

│   ├── app.module.ts               Root module and global providers

│   ├── app.controller.ts           Health check

│   ├── common/

│   │   ├── decorators/             @Public, @Roles, @CurrentUser, @OrgId, @AuditLog and more

│   │   ├── dto/                    Shared DTOs such as pagination

│   │   ├── filters/                Global exception filter

│   │   ├── guards/                 JwtAuthGuard, OrgMemberGuard, RolesGuard

│   │   ├── interceptors/           Response envelope, audit logging

│   │   ├── interfaces/             Shared types such as JwtPayload

│   │   └── utils/                  OTP, tokens, HTML escaping, pagination, slugs, tenancy helpers

│   ├── config/                     Typed config: app, database, jwt, resend, throttler

│   ├── database/                   Prisma module and service

│   ├── generated/prisma/           Generated Prisma client (do not edit by hand)

│   └── modules/

│       ├── auth/

│       ├── organizations/

│       ├── memberships/

│       ├── invitations/

│       ├── order-notes/

│       ├── attachments/            Includes the UploadThing router

│       ├── notifications/

│       ├── audit-logs/

│       ├── email/                  Service, layout, templates

│       └── cron/jobs/              Scheduled maintenance jobs

├── test/jest-e2e.json              End-to-end test config (no test files yet)

├── CLAUDE.md                       Guidance for AI coding assistants

├── CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md · LICENSE

├── Dockerfile · docker-compose.yml

└── prisma.config.ts · nest-cli.json · eslint.config.mjs · tsconfig*.json

```

Feature modules follow one internal shape:

```text

modules/<feature>/

├── <feature>.module.ts

├── <feature>.controller.ts    Routes, Swagger decorators, guards

├── <feature>.service.ts       Business rules and Prisma queries

├── dto/                       Request validation

└── entities/                  Response shapes for Swagger

```

---

## 🧱 Engineering Standards

| Area | Standard |
|---|---|
| **Layering** | Controllers bind and guard. Services decide and query. |
| **Types** | TypeScript strict mode. Avoid `any`. |
| **Validation** | Every input is a DTO with `class-validator` rules. |
| **Docs** | Endpoints carry Swagger decorators. |
| **Tenancy** | Queries on tenant data are scoped by organization. |
| **Commits** | Conventional Commits. |

### Quality checks

```bash

pnpm type-check   # tsc --noEmit

pnpm lint         # eslint (auto-fixes)

pnpm build        # nest build

pnpm test         # jest (no tests written yet)

```

Husky runs a pre-commit hook locally, and CI runs on pull requests.

---

## 🔒 Security Model

The table summarizes the intended controls reflected by the current application structure and configuration. Review the corresponding implementation before relying on any control in a production threat model. Orderspace has not been independently audited or penetration tested.

| Threat | Mitigation |
|---|---|
| Reading another tenant's data | `OrgMemberGuard` verifies membership on organization-scoped routes, and services scope tenant queries by organization |
| Privilege escalation | `RolesGuard` enforces the role hierarchy, with owner-only actions for destructive operations |
| Stolen access token | Short access token lifetime (15 minutes by default) |
| Stolen refresh token | Refresh tokens are stored hashed, rotated on use, and revoked on logout or password reset |
| Weak or leaked passwords | Passwords are hashed with bcrypt |
| OTP guessing | OTPs are stored hashed, expire, and failed attempts are counted |
| Brute force and abuse | A global throttler is configured; route-specific limits should be verified against the auth controllers and throttler configuration |
| Mass assignment | Whitelist-only DTO validation rejects unknown fields |
| SQL injection | Data access goes through Prisma's parameterized API |
| Script injection in email | Dynamic values in email templates are HTML-escaped |
| Browser attacks | Helmet sets standard security headers |
| Sensitive values in audit logs | Audit-log redaction is intended to prevent credentials and tokens from being recorded; verify the redaction utility and interceptor when changing logged fields |
| Exposed API documentation | Production bootstrap must skip Swagger setup when `NODE_ENV=production`; verify `/api/docs` returns `404` after deployment |

To report a vulnerability, follow [SECURITY.md](SECURITY.md).

---

## ⏰ Background Jobs

Implemented with `@nestjs/schedule` in `src/modules/cron/jobs/`.

| Job | Does |
|---|---|
| **Invitation expiry** | Marks pending invitations as expired once past their expiry time |
| **Low stock alert** | Notifies admins when a product reaches its threshold |
| **Stale order reminder** | Flags orders left pending too long |
| **Token cleanup** | Deletes expired and revoked refresh tokens |
| **Notification cleanup** | Removes old notifications |

---

## ✉️ Transactional Email

Delivered through [Resend](https://resend.com) using HTML templates with escaped content (`src/modules/email/`).

| Email | Sent when | Recipient |
|---|---|---|
| Email verification | Registration | New user |
| Password reset code | Forgot password | User |
| Invitation | Admin invites someone | Invitee |
| Welcome | Invitation accepted | New member |
| Low stock alert | Stock job finds products below threshold | Organization admins |

Run `pnpm test:resend` to confirm your Resend credentials work.

---

## 🚢 Deployment

```bash

docker build -t orderspace .

docker run -p 3000:3000 \

  -e NODE_ENV="production" \

  -e DATABASE_URL="postgresql://user:pass@host:5432/orderspace" \

  -e JWT_SECRET="..." \

  -e JWT_REFRESH_SECRET="..." \

  -e RESEND_API_KEY="..." \

  -e UPLOADTHING_TOKEN="..." \

  -e CORS_ORIGINS="https://app.example.com" \

  orderspace

```

Apply migrations to the production database with `pnpm prisma:migrate:deploy` before the first start. The health check is `GET /api`.

### Production checklist

- [ ] `NODE_ENV=production` and verify the Swagger setup is conditionally skipped (the docs route must return `404`)

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are long, random, and different from each other

- [ ] `CORS_ORIGINS` lists only your real frontends

- [ ] The database user has only the permissions the app needs

- [ ] Automated database backups are enabled and a restore has been tested

- [ ] Resend sender domain is verified

- [ ] `GET /api/docs` returns `404` on the deployed instance (verify this after deployment)

---

## 🗺️ Roadmap

| Stage | Focus | Status |
|---|---|---|
| **v0.1** | Auth, organizations, memberships, invitations | **Done** |
| **v0.2** | Catalog (categories, products) and customers APIs | 🗓️ Planned. Database models exist, API modules do not. |
| **v0.3** | Inventory and the order pipeline with status lifecycle | 🗓️ Planned. `Order`, notes, and attachments exist, but order and inventory APIs do not. |
| **v0.4** | Notifications, email, audit log, scheduled jobs | **Done** |
| **v0.5** | Hardening: automated tests, load testing, production deployment | **Not complete** — no automated tests are currently present; load testing and production readiness are not established. |
| **Later** | Payments, invoicing and PDF export, webhooks, multi-currency, reporting | 💡 Ideas |

### Planned order lifecycle

This is the design for v0.3 and is not implemented yet.

```mermaid

stateDiagram-v2

    direction LR

    [*] --> DRAFT

    DRAFT --> PENDING: submit

    PENDING --> CONFIRMED: confirm

    PENDING --> CANCELLED: cancel

    CONFIRMED --> PROCESSING: start fulfilment

    CONFIRMED --> CANCELLED: cancel and release stock

    PROCESSING --> SHIPPED: ship

    SHIPPED --> DELIVERED: deliver

    DELIVERED --> REFUNDED: refund

```

---

## 🩺 Troubleshooting

<details>

<summary><strong>The app fails on start with a Prisma or type error after pulling changes</strong></summary>

<br />

The generated client is stale. Run `pnpm prisma:generate`, then restart.

</details>

<details>

<summary><strong>Cannot connect to the database</strong></summary>

<br />

Check the container with `docker compose ps`, make sure the port in `DATABASE_URL` matches `docker-compose.yml`, and that no local PostgreSQL is already using the port.

</details>

<details>

<summary><strong>Verification emails never arrive</strong></summary>

<br />

Confirm `RESEND_API_KEY` is set, run `pnpm test:resend`, and make sure the sender uses a domain verified in Resend. Check spam too.

</details>

<details>

<summary><strong>Every request returns 401</strong></summary>

<br />

The access token has expired. Call `POST /api/auth/refresh` or log in again.

</details>

<details>

<summary><strong>I get 429 Too Many Requests during testing</strong></summary>

<br />

Raise `THROTTLE_LIMIT` in your local `.env`. Keep the production value conservative.

</details>

<details>

<summary><strong>pnpm blocks a package build script</strong></summary>

<br />

Newer pnpm versions skip native build scripts until approved. Run `pnpm approve-builds` and select `bcrypt` and the Prisma packages.

</details>

---

## 🤝 Contributing

Issues are welcome: bug reports, questions, and suggestions can be opened on [GitHub Issues](https://github.com/josephstephen-dev/orderspace/issues). Code contributions are by invitation only. Please open an issue and discuss it with the maintainer before writing any code. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 👤 Maintainer

**Stephen P. Joseph** · `engineerjsp`

Backend engineer and author of Orderspace.

| | |
|---|---|
| **Email** | [josephstep486@gmail.com](mailto:josephstep486@gmail.com) |
| **GitHub** | [github.com/josephstephen-dev](https://github.com/josephstephen-dev) |
| **LinkedIn** | [linkedin.com/in/engineerjsp](https://www.linkedin.com/in/engineerjsp) |
| **Instagram** | [@engineerjsp](https://www.instagram.com/engineerjsp) |
| **Facebook** | [facebook.com/engineerjsp](https://www.facebook.com/engineerjsp) |
| **WhatsApp** | `engineerjsp` |

---

## 📄 License

Orderspace is proprietary software. All rights reserved.

Copyright © 2026 Stephen P. Joseph (`engineerjsp`). See [LICENSE](LICENSE) for the full terms.\n
