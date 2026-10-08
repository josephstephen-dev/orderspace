<div align="center">

# 📦 Orderspace

**One backend. Many businesses. Every order accounted for.**

A multi-tenant **order management API** that lets each organization run its own catalog, customers, stock, and order pipeline in complete isolation, built on NestJS, Prisma, and PostgreSQL.

<br />

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-B91C1C?style=for-the-badge)

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [API Conventions](#-api-conventions) · [API Reference](#-api-reference) · [Configuration](#-configuration) · [Deployment](#-deployment) · [Contact](#-maintainer)

</div>

---

## 📑 Contents

1. [At a Glance](#-at-a-glance)
2. [Why Orderspace](#-why-orderspace)
3. [Feature Tour](#-feature-tour)
4. [Quick Start](#-quick-start)
5. [Architecture](#-architecture)
6. [Domain Model](#-domain-model)
7. [API Conventions](#-api-conventions)
8. [API Walkthrough](#-api-walkthrough)
9. [API Reference](#-api-reference)
10. [Configuration](#-configuration)
11. [Project Layout](#-project-layout)
12. [Engineering Standards](#-engineering-standards)
13. [Security Model](#-security-model)
14. [Background Jobs](#-background-jobs)
15. [Transactional Email](#-transactional-email)
16. [Deployment](#-deployment)
17. [Roadmap](#-roadmap)
18. [Troubleshooting](#-troubleshooting)
19. [Maintainer](#-maintainer)
20. [License](#-license)

---

## ⚡ At a Glance

| | |
|---|---|
| **What it is** | A REST API backend with no bundled frontend |
| **Tenancy model** | Shared database, shared schema, organization-scoped rows |
| **Who can do what** | Four organization roles plus one global super-admin role |
| **Core entities** | Organizations, products, customers, inventory, orders |
| **Realtime** | Server-Sent Events for in-app notifications |
| **Auth** | Short-lived JWT access tokens, rotating refresh tokens, OTP email verification |
| **Docs** | Swagger UI served from the running app at `/api/docs` |
| **Runs on** | Node.js 22, PostgreSQL 16, or Docker |
| **Package manager** | pnpm 11 |

---

## 🎯 Why Orderspace

Taking an order is easy. Taking thousands of them across many independent businesses, without one business ever seeing another's data, without overselling stock, and with a trustworthy record of who changed what, is the hard part. Orderspace is built around four commitments:

| Principle | What it means in practice |
|---|---|
| **Isolation first** | Every business record carries an organization ID. Guards verify membership before any controller runs, and every query is scoped by that organization. |
| **Never lose history** | Orders keep a status timeline, prices are snapshotted onto order lines, deletes are soft, and an audit log records before and after states. |
| **Stock you can trust** | Inventory changes only through recorded adjustments, so every unit that moved has a reason and an author. |
| **Predictable API** | One response envelope, one error shape, one auth model, and Swagger docs generated from the same decorators that protect the routes. |

---

## 🧭 Feature Tour

<details open>
<summary><strong>🏢 Workspaces and teams</strong></summary>

<br />

- Create organizations and become their owner
- Invite teammates by email with expiring, single-use tokens
- Four roles with a strict hierarchy: `OWNER > ADMIN > MEMBER > VIEWER`
- Transfer ownership, change roles, remove members, or leave an organization
- Soft-deleted organizations can be recovered

</details>

<details open>
<summary><strong>🛍️ Catalog</strong></summary>

<br />

- Products with SKU, description, price, and a low-stock threshold
- SKU uniqueness enforced per organization, not globally
- Categories to group products
- Archive products you no longer sell without losing the orders that reference them

</details>

<details open>
<summary><strong>👥 Customers</strong></summary>

<br />

- Customer records with contact details and addresses
- Search and paginate customer lists
- View the full order history of any customer

</details>

<details open>
<summary><strong>📊 Inventory</strong></summary>

<br />

- Current stock level on every product
- Manual adjustments tagged with a reason: restock, sale, return, damage, correction
- Stock is reserved when an order is confirmed and released if it is cancelled
- A low-stock view that lists everything at or below its threshold

</details>

<details open>
<summary><strong>🧾 Orders</strong></summary>

<br />

- Multi-line orders with quantity, unit price snapshot, and computed totals
- A controlled status lifecycle: draft, pending, confirmed, processing, shipped, delivered, plus cancelled and refunded
- Invalid transitions are rejected by the API, never silently accepted
- A status history entry for every transition, including who made it and when
- Internal notes and file attachments on each order
- Human-friendly per-organization order numbers like `ORD-1042`

</details>

<details open>
<summary><strong>🔔 Awareness</strong></summary>

<br />

- Live notifications over Server-Sent Events
- Persistent in-app inbox with read and unread state
- Email alerts for the events that matter
- An immutable audit log that admins can query

</details>

<details open>
<summary><strong>🛡️ Platform</strong></summary>

<br />

- Helmet security headers, CORS allowlist, and global rate limiting
- Whitelist-only request validation
- Scheduled maintenance jobs
- Dockerfile with a multi-stage build and a CI pipeline that gates every pull request

</details>

---

## 🚀 Quick Start

Get a working API running locally in about five minutes.

**Prerequisites:** Node.js 22 or newer, Docker (for PostgreSQL), and a free [Resend](https://resend.com) account if you want to test email.

```bash
# 1. Get the code
git clone https://github.com/josephstephen-dev/orderspace.git
cd orderspace

# 2. Enable the pinned package manager and install
corepack enable
pnpm install

# 3. Configure the environment
cp .env.example .env          # on Windows PowerShell: Copy-Item .env.example .env

# 4. Start PostgreSQL
docker compose up -d

# 5. Generate the Prisma client and create the tables
pnpm prisma:generate
pnpm prisma:migrate

# 6. Run the API in watch mode
pnpm start:dev
```

Then open:

| URL | What you get |
|---|---|
| `http://localhost:3000/api` | Health check |
| `http://localhost:3000/api/docs` | Interactive Swagger UI |

> **Tip:** if registration emails never arrive during local development, check that `RESEND_API_KEY` is set. See [Troubleshooting](#-troubleshooting).

---

## 🏗️ Architecture

### System layers

Requests flow top to bottom. Each layer has one job and only talks to the layer beneath it.

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

    subgraph Domain["Domain modules"]
        direction LR
        M1["auth"]
        M2["organizations"]
        M3["memberships"]
        M4["invitations"]
        M5["categories"]
        M6["products"]
        M7["customers"]
        M8["inventory"]
        M9["orders"]
        M10["attachments"]
        M11["notifications"]
        M12["audit-logs"]
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
    M10 --> UT
```

### How the tenant is resolved

Most routes carry the organization in the URL. A few nested routes only carry a child ID, so the guards walk up to the owning organization before checking membership.

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

### Placing and fulfilling an order

This is the path that touches the most moving parts: stock, history, notifications, and audit.

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Team member
    participant API as Orders API
    participant DB as PostgreSQL
    participant N as Notifications
    participant E as Email

    Staff->>API: POST /orders (customer, line items)
    API->>DB: Validate customer and products belong to this org
    API->>DB: Snapshot prices, compute totals, allocate order number
    API-->>Staff: 201 order in DRAFT

    Staff->>API: PATCH /orders/:id/status { PENDING }
    API->>DB: Check transition is allowed, write status history
    API-->>Staff: 200 order in PENDING

    Staff->>API: PATCH /orders/:id/status { CONFIRMED }
    API->>DB: Begin transaction
    API->>DB: Verify stock for every line
    API->>DB: Decrement stock, write adjustment rows
    API->>DB: Write status history, commit
    API->>N: Emit ORDER_STATUS_CHANGED
    N->>E: Send order confirmation to customer
    API-->>Staff: 200 order in CONFIRMED

    Note over API,DB: If any line lacks stock the transaction rolls back and nothing changes
```

### Order lifecycle

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
    CANCELLED --> [*]
    REFUNDED --> [*]
    DELIVERED --> [*]
```

| From | Allowed next states | Stock effect |
|---|---|---|
| `DRAFT` | `PENDING` | None |
| `PENDING` | `CONFIRMED`, `CANCELLED` | None |
| `CONFIRMED` | `PROCESSING`, `CANCELLED` | Stock decremented on entry, restored on cancel |
| `PROCESSING` | `SHIPPED` | None |
| `SHIPPED` | `DELIVERED` | None |
| `DELIVERED` | `REFUNDED` | Optional restock decided by the admin |
| `CANCELLED`, `REFUNDED` | none | Terminal |

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
    V["VIEWER<br/>read everything"] --> M["MEMBER<br/>work orders and customers"] --> A["ADMIN<br/>catalog, stock, people, audit"] --> O["OWNER<br/>delete org, transfer ownership"]
    S(["SUPER_ADMIN<br/>platform operator"]) -.-> O
```

| Capability | VIEWER | MEMBER | ADMIN | OWNER |
|---|:---:|:---:|:---:|:---:|
| Read products, customers, orders, stock | ✅ | ✅ | ✅ | ✅ |
| Create and edit customers | ❌ | ✅ | ✅ | ✅ |
| Create orders and move them through the pipeline | ❌ | ✅ | ✅ | ✅ |
| Add order notes and attachments | ❌ | ✅ | ✅ | ✅ |
| Manage products and categories | ❌ | ❌ | ✅ | ✅ |
| Adjust inventory | ❌ | ❌ | ✅ | ✅ |
| Refund orders | ❌ | ❌ | ✅ | ✅ |
| Invite, re-role, and remove members | ❌ | ❌ | ✅ | ✅ |
| Read the audit log | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership or delete the organization | ❌ | ❌ | ❌ | ✅ |

### Notification flow

```mermaid
flowchart LR
    subgraph Sources
        S1["Order created"]
        S2["Status changed"]
        S3["Note added"]
        S4["Low stock job"]
        S5["Stale order job"]
        S6["Member joined or removed"]
    end

    Sources --> SVC["NotificationsService.createAndEmit"]

    SVC --> D1[("Persist in database")]
    SVC --> D2["Push to open SSE streams"]
    SVC --> D3["Queue email via Resend"]
```

---

## 🗃️ Domain Model

### Entity relationships

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : "belongs through"
    ORGANIZATION ||--o{ MEMBERSHIP : "has"
    ORGANIZATION ||--o{ INVITATION : "issues"
    ORGANIZATION ||--o{ CATEGORY : "owns"
    ORGANIZATION ||--o{ PRODUCT : "owns"
    ORGANIZATION ||--o{ CUSTOMER : "owns"
    ORGANIZATION ||--o{ ORDER : "owns"
    ORGANIZATION ||--o{ AUDIT_LOG : "records"
    CATEGORY ||--o{ PRODUCT : "groups"
    PRODUCT ||--o{ INVENTORY_ADJUSTMENT : "changes stock via"
    CUSTOMER ||--o{ ORDER : "places"
    ORDER ||--|{ ORDER_ITEM : "contains"
    PRODUCT ||--o{ ORDER_ITEM : "sold as"
    ORDER ||--o{ ORDER_STATUS_HISTORY : "logs"
    ORDER ||--o{ ORDER_NOTE : "has"
    ORDER ||--o{ ATTACHMENT : "has"
    USER ||--o{ REFRESH_TOKEN : "holds"
    USER ||--o{ OTP_CODE : "receives"
    USER ||--o{ NOTIFICATION : "receives"

    ORGANIZATION {
        uuid id PK
        string name
        string slug
        json settings
        int nextOrderNumber
        datetime deletedAt
    }
    PRODUCT {
        uuid id PK
        uuid organizationId FK
        string sku
        string name
        decimal price
        int stockQuantity
        int lowStockThreshold
        enum status
    }
    ORDER {
        uuid id PK
        uuid organizationId FK
        uuid customerId FK
        int orderNumber
        enum status
        decimal subtotal
        decimal total
        datetime deletedAt
    }
    ORDER_ITEM {
        uuid id PK
        uuid orderId FK
        uuid productId FK
        int quantity
        decimal unitPrice
        decimal lineTotal
    }
```

### Design decisions worth knowing

| Decision | Reason |
|---|---|
| **Money is `Decimal`, never a float** | Floating point cannot represent most currency values exactly. Totals must add up to the cent. |
| **Unit price is copied onto `OrderItem`** | Changing a product's price later must never rewrite an old order. |
| **Order numbers are per organization** | Each business sees `ORD-1`, `ORD-2`, and so on. The counter is incremented inside a transaction to avoid duplicates. |
| **SKU is unique per organization** | Two businesses can both sell `TSHIRT-M` without colliding. Enforced with a composite unique index. |
| **Stock changes go through adjustments** | The `stockQuantity` column is a cached total. The adjustment rows are the audit trail that explains it. |
| **Soft delete on core records** | Organizations, products, customers, and orders carry `deletedAt` so an accidental delete is recoverable. |
| **Composite uniqueness for tenancy** | For example `[userId, organizationId]` on memberships prevents duplicate membership rows. |

### Enumerations

| Enum | Values |
|---|---|
| `GlobalRole` | `SUPER_ADMIN`, `USER` |
| `MembershipRole` | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| `ProductStatus` | `ACTIVE`, `ARCHIVED` |
| `OrderStatus` | `DRAFT`, `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `InvitationStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED` |
| `AdjustmentReason` | `RESTOCK`, `SALE`, `RETURN`, `DAMAGE`, `CORRECTION` |
| `NotificationType` | `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_NOTE_ADDED`, `LOW_STOCK`, `ORDER_STALE`, `MEMBER_JOINED`, `MEMBER_REMOVED` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `ARCHIVE`, `INVITE`, `JOIN`, `LEAVE`, `STATUS_CHANGE` |
| `AttachmentSource` | `UPLOAD`, `URL` |
| `OtpPurpose` | `EMAIL_VERIFICATION`, `PASSWORD_RESET` |

---

## 📐 API Conventions

Every endpoint lives under the `/api` prefix and follows the same rules.

### Authentication

Send the access token on every protected request:

```http
Authorization: Bearer <accessToken>
```

Routes marked **Public** in the reference below need no token.

### Success envelope

Every successful response is wrapped the same way, so clients can always read `data`.

```json
{
  "data": {
    "id": "b6f1c0de-2f0e-4c61-9a52-3d1f6a2c9e10",
    "orderNumber": 1042,
    "status": "CONFIRMED",
    "total": "149.50"
  },
  "meta": {
    "timestamp": "2026-10-07T09:30:00.000Z"
  }
}
```

### Error shape

All failures pass through one exception filter, so errors look alike regardless of where they originate.

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Insufficient stock for SKU TSHIRT-M",
  "path": "/api/organizations/9c2f.../orders/b6f1.../status",
  "timestamp": "2026-10-07T09:30:00.000Z"
}
```

| Status | Meaning in Orderspace |
|---|---|
| `400` | Validation failed or an unknown field was sent |
| `401` | Missing, expired, or invalid access token |
| `403` | Authenticated, but not a member or role too low |
| `404` | Resource does not exist in this organization |
| `409` | Conflict such as duplicate SKU or insufficient stock |
| `422` | Illegal state transition, for example shipping a draft |
| `429` | Rate limit exceeded |

### Pagination and filtering

List endpoints accept `page` and `limit` and return the page together with totals.

```http
GET /api/organizations/{orgId}/orders?status=PENDING&customerId={id}&page=1&limit=20
```

### Rate limiting

A global throttler applies to every route, and authentication routes use stricter limits. The defaults are `THROTTLE_LIMIT=10` requests per `THROTTLE_TTL=60` seconds and can be tuned per environment.

### Validation

Request bodies are validated against DTOs with `whitelist` and `forbidNonWhitelisted` switched on. Unknown properties are rejected rather than ignored, which keeps clients honest and prevents mass-assignment mistakes.

---

## 🧪 API Walkthrough

A realistic end-to-end session with `curl`. Replace the placeholder values with real IDs from each response.

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

# 4. Add a product and stock it
PRODUCT=$(curl -s -X POST $BASE/organizations/$ORG/products -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sku":"ANK-001","name":"Ankara Fabric 6 yards","price":"45.00","lowStockThreshold":5}' | jq -r '.data.id')

curl -X POST $BASE/organizations/$ORG/products/$PRODUCT/adjustments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":100,"reason":"RESTOCK"}'

# 5. Add a customer
CUSTOMER=$(curl -s -X POST $BASE/organizations/$ORG/customers -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Chioma Stores","email":"orders@chioma.example"}' | jq -r '.data.id')

# 6. Place an order and walk it through the pipeline
ORDER=$(curl -s -X POST $BASE/organizations/$ORG/orders -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER\",\"items\":[{\"productId\":\"$PRODUCT\",\"quantity\":10}]}" | jq -r '.data.id')

for STATUS in PENDING CONFIRMED PROCESSING SHIPPED DELIVERED; do
  curl -X PATCH $BASE/organizations/$ORG/orders/$ORDER/status \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"status\":\"$STATUS\"}"
done

# 7. Review the timeline
curl $BASE/organizations/$ORG/orders/$ORDER/history -H "Authorization: Bearer $TOKEN"
```

---

## 📚 API Reference

Click a section to expand it. **Min role** is the lowest organization role allowed to call the endpoint.

<details>
<summary><strong>🔐 Authentication</strong> (11 endpoints)</summary>

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
<summary><strong>🏢 Organizations</strong> (6 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `POST` | `/organizations` | Create an organization | JWT |
| `GET` | `/organizations` | List yours | JWT |
| `GET` | `/organizations/:id` | Read one | MEMBER |
| `PATCH` | `/organizations/:id` | Update | ADMIN |
| `DELETE` | `/organizations/:id` | Soft delete | OWNER |
| `PATCH` | `/organizations/:id/transfer` | Transfer ownership | OWNER |

</details>

<details>
<summary><strong>🤝 Memberships and invitations</strong> (10 endpoints)</summary>

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
<summary><strong>🛍️ Categories and products</strong> (11 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `GET` | `/organizations/:orgId/categories` | List categories | MEMBER |
| `POST` | `/organizations/:orgId/categories` | Create | ADMIN |
| `PATCH` | `/organizations/:orgId/categories/:id` | Update | ADMIN |
| `DELETE` | `/organizations/:orgId/categories/:id` | Delete | ADMIN |
| `GET` | `/organizations/:orgId/products` | List with filters | VIEWER |
| `POST` | `/organizations/:orgId/products` | Create | ADMIN |
| `GET` | `/organizations/:orgId/products/:id` | Read | VIEWER |
| `PATCH` | `/organizations/:orgId/products/:id` | Update | ADMIN |
| `POST` | `/organizations/:orgId/products/:id/archive` | Archive | ADMIN |
| `DELETE` | `/organizations/:orgId/products/:id` | Soft delete | ADMIN |
| `POST` | `/organizations/:orgId/products/:id/restore` | Restore | ADMIN |

</details>

<details>
<summary><strong>👥 Customers</strong> (6 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `GET` | `/organizations/:orgId/customers` | List and search | VIEWER |
| `POST` | `/organizations/:orgId/customers` | Create | MEMBER |
| `GET` | `/organizations/:orgId/customers/:id` | Read | VIEWER |
| `PATCH` | `/organizations/:orgId/customers/:id` | Update | MEMBER |
| `DELETE` | `/organizations/:orgId/customers/:id` | Soft delete | ADMIN |
| `GET` | `/organizations/:orgId/customers/:id/orders` | Order history | VIEWER |

</details>

<details>
<summary><strong>📊 Inventory</strong> (4 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `GET` | `/organizations/:orgId/inventory` | Stock levels | VIEWER |
| `GET` | `/organizations/:orgId/inventory/low-stock` | Products at or below threshold | VIEWER |
| `POST` | `/organizations/:orgId/products/:id/adjustments` | Record an adjustment | ADMIN |
| `GET` | `/organizations/:orgId/products/:id/adjustments` | Adjustment history | VIEWER |

</details>

<details>
<summary><strong>🧾 Orders</strong> (12 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `POST` | `/organizations/:orgId/orders` | Create an order | MEMBER |
| `GET` | `/organizations/:orgId/orders` | List with filters | VIEWER |
| `GET` | `/organizations/:orgId/orders/:id` | Read | VIEWER |
| `PATCH` | `/organizations/:orgId/orders/:id` | Edit a draft or pending order | MEMBER |
| `PATCH` | `/organizations/:orgId/orders/:id/status` | Move to the next status | MEMBER |
| `POST` | `/organizations/:orgId/orders/:id/cancel` | Cancel | MEMBER |
| `POST` | `/organizations/:orgId/orders/:id/refund` | Refund a delivered order | ADMIN |
| `DELETE` | `/organizations/:orgId/orders/:id` | Soft delete a draft | ADMIN |
| `POST` | `/organizations/:orgId/orders/:id/restore` | Restore | ADMIN |
| `GET` | `/organizations/:orgId/orders/:id/history` | Status timeline | VIEWER |
| `GET` | `/organizations/:orgId/orders/:id/notes` | List notes | VIEWER |
| `POST` | `/organizations/:orgId/orders/:id/notes` | Add a note | MEMBER |

</details>

<details>
<summary><strong>📎 Attachments</strong> (3 endpoints)</summary>

<br />

| Method | Endpoint | Purpose | Min role |
|---|---|---|---|
| `GET` | `/orders/:orderId/attachments` | List | VIEWER |
| `POST` | `/orders/:orderId/attachments` | Save metadata after upload | MEMBER |
| `DELETE` | `/orders/:orderId/attachments/:id` | Remove | MEMBER |

File bytes are uploaded through the UploadThing handler mounted at `/api/uploadthing`. The endpoints above only store metadata.

</details>

<details>
<summary><strong>🔔 Notifications and audit</strong> (7 endpoints)</summary>

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

### Application

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `APP_NAME` | No | `orderspace` | Shown in logs and emails |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `CORS_ORIGINS` | No | none | Comma-separated list of allowed origins |

### Database

| Variable | Required | Notes |
|---|:---:|---|
| `DATABASE_URL` | Yes | Example: `postgresql://postgres:postgres@localhost:5433/orderspace` |

### Authentication

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `JWT_SECRET` | Yes | none | Signs access tokens. Use a long random value. |
| `JWT_REFRESH_SECRET` | Yes | none | Signs refresh tokens. Must differ from `JWT_SECRET`. |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |

### Rate limiting

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `THROTTLE_TTL` | No | `60` | Window in seconds |
| `THROTTLE_LIMIT` | No | `10` | Requests per window |

### Third-party services

| Variable | Required | Notes |
|---|:---:|---|
| `RESEND_API_KEY` | Yes | Email delivery |
| `RESEND_FROM_EMAIL` | No | Sender address, must be on a verified domain |
| `RESEND_FROM_NAME` | No | Sender display name, defaults to `Orderspace` |
| `UPLOADTHING_TOKEN` | Yes | File uploads |

> Generate strong secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

---

## 🗂️ Project Layout

```text
orderspace/
├── .github/
│   ├── workflows/ci.yml            CI: generate, type-check, lint, build
│   ├── dependabot.yml              Weekly dependency updates
│   ├── ISSUE_TEMPLATE/             Bug report and feature request forms
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                         Pre-commit hooks
├── assets/                         Images used by documentation
├── prisma/
│   ├── schema.prisma               Source of truth for the data model
│   ├── seed.ts                     Development seed data
│   └── migrations/                 Versioned SQL migrations
├── scripts/
│   └── test-resend.ts              Sends a test email to verify credentials
├── src/
│   ├── main.ts                     Bootstrap: prefix, pipes, Swagger, UploadThing
│   ├── app.module.ts               Root module and global providers
│   ├── app.controller.ts           Health check
│   ├── common/
│   │   ├── decorators/             @Public, @Roles, @CurrentUser, @OrgId, @AuditLog
│   │   ├── filters/                Global exception filter
│   │   ├── guards/                 Jwt, OrgMember, Roles
│   │   ├── interceptors/           Response envelope, audit logging
│   │   ├── interfaces/             Shared types such as JwtPayload
│   │   └── utils/                  OTP generation, HTML escaping
│   ├── config/                     Typed config factories and env helpers
│   ├── database/                   Prisma module and service
│   ├── generated/prisma/           Generated client (do not edit by hand)
│   └── modules/
│       ├── auth/ users/
│       ├── organizations/ memberships/ invitations/
│       ├── categories/ products/ inventory/
│       ├── customers/ orders/ attachments/
│       ├── notifications/ audit-logs/
│       ├── email/
│       └── cron/jobs/
├── test/                           End-to-end tests and config
├── Dockerfile                      Multi-stage production image
├── docker-compose.yml              Local PostgreSQL
└── CLAUDE.md                       Guidance for AI coding assistants
```

Every feature module uses the same internal shape, so finding code is predictable:

```text
modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts    Routes, Swagger decorators, guards. No business logic.
├── <feature>.service.ts       Business rules and every Prisma query
├── dto/                       Request validation
└── entities/                  Response shapes for Swagger
```

---

## 🧱 Engineering Standards

| Area | Standard |
|---|---|
| **Layering** | Controllers bind and guard. Services decide and query. Nothing else touches Prisma. |
| **Types** | TypeScript strict mode. Avoid `any`. |
| **Validation** | Every input is a DTO with `class-validator` rules. |
| **Docs** | Every endpoint carries `@ApiTags`, `@ApiOperation`, and response decorators. |
| **Tenancy** | Every query on tenant data includes the organization in its `where` clause. |
| **Deletes** | Prefer soft delete with `deletedAt`, and filter it out on reads. |
| **Money** | `Decimal` only. |
| **Transactions** | Anything that changes stock and order state together runs in one transaction. |
| **Commits** | Conventional Commits, enforced by review. |
| **Branches** | Feature branches off `dev`, squash merged. `main` receives only release merges. |

### Quality gates

Husky runs these locally before a commit, and CI runs the same checks on every pull request.

```bash
pnpm type-check   # tsc --noEmit
pnpm format       # prettier
pnpm lint         # eslint
pnpm build        # nest build
pnpm test         # unit tests
```

### Git workflow

```mermaid
gitGraph
    commit id: "init"
    branch dev
    checkout dev
    commit id: "scaffold"
    branch feat/orders
    commit id: "order model"
    commit id: "status machine"
    checkout dev
    merge feat/orders tag: "squash"
    branch fix/stock-rollback
    commit id: "rollback on shortage"
    checkout dev
    merge fix/stock-rollback tag: "squash"
    checkout main
    merge dev tag: "v0.1.0"
```

---

## 🔒 Security Model

| Threat | Mitigation |
|---|---|
| Reading another tenant's data | Membership verified by guard on every request, and all queries scoped by organization |
| Privilege escalation | Role hierarchy enforced by `RolesGuard`, with owner-only actions for destructive operations |
| Stolen access token | 15 minute lifetime limits exposure |
| Stolen refresh token | Tokens are hashed at rest, rotated on use, and revoked on logout or password reset |
| Weak or leaked passwords | bcrypt hashing with per-password salt |
| Account takeover through OTP guessing | OTPs are hashed, expire in 15 minutes, and count failed attempts |
| Brute force and abuse | Global throttling with stricter limits on auth routes |
| Mass assignment | Whitelist-only DTO validation rejects unknown fields |
| SQL injection | Prisma parameterizes every query |
| Script injection in email | All dynamic template values are HTML-escaped |
| Browser attacks | Helmet sets CSP, HSTS, frame, and sniffing protections |
| Secrets in logs | Passwords and tokens are stripped from audit snapshots |
| Unauthorized silent changes | Immutable audit log with before and after snapshots, IP address, and user agent |
| Accidental data loss | Soft deletes on core records |

To report a vulnerability, follow [SECURITY.md](SECURITY.md).

---

## ⏰ Background Jobs

| Job | Runs | Does |
|---|---|---|
| **Invitation expiry** | Hourly | Marks pending invitations `EXPIRED` once past `expiresAt` |
| **Low stock alert** | Every 6 hours | Notifies admins when a product reaches its threshold |
| **Stale order reminder** | Daily at 08:00 | Flags orders left in `PENDING` too long |
| **Token cleanup** | Daily at 02:00 | Deletes expired and revoked refresh tokens |

Jobs are implemented with `@nestjs/schedule` in `src/modules/cron/jobs/`.

---

## ✉️ Transactional Email

Delivered through [Resend](https://resend.com) using responsive HTML templates with escaped content.

| Email | Sent when | Recipient |
|---|---|---|
| Email verification | Registration | New user |
| Password reset code | Forgot password | User |
| Invitation | Admin invites someone | Invitee |
| Welcome | Invitation accepted | New member |
| Order confirmation | Order reaches `CONFIRMED` | Customer |
| Order shipped | Order reaches `SHIPPED` | Customer |
| Low stock alert | Stock job finds products below threshold | Organization admins |

Run `pnpm test:resend` to confirm your Resend credentials work before relying on email.

---

## 🚢 Deployment

### Docker image

The `Dockerfile` builds in three stages to keep the final image small.

```mermaid
flowchart LR
    A["deps<br/>install packages"] --> B["builder<br/>prisma generate<br/>nest build"] --> C["runner<br/>compiled app only<br/>node:22-alpine"]
```

```bash
docker build -t orderspace .

docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/orderspace" \
  -e JWT_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  -e RESEND_API_KEY="..." \
  -e UPLOADTHING_TOKEN="..." \
  -e CORS_ORIGINS="https://app.example.com" \
  orderspace
```

On start the container runs `prisma migrate deploy` and then launches `node dist/src/main`. A health check calls `GET /api`.

### Release flow

```mermaid
flowchart LR
    F["Feature branch"] --> PR1["PR into dev"] --> CI1["CI passes"] --> D["Merged to dev"] --> PR2["Release PR into main"] --> CI2["CI passes"] --> M["Merged to main"] --> R["Build image and deploy"] --> MG["prisma migrate deploy"] --> L["Live"]
```

### Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are long, random, and different from each other
- [ ] `CORS_ORIGINS` lists only your real frontends
- [ ] The database user has only the permissions the app needs
- [ ] Automated database backups are enabled and a restore has been tested
- [ ] Resend sender domain is verified
- [ ] Logs are shipped somewhere searchable
- [ ] `/api/docs` is protected or disabled if the API should not be publicly documented

---

## 🗺️ Roadmap

| Stage | Focus | Status |
|---|---|---|
| **v0.1** | Auth, organizations, memberships, invitations | Planned |
| **v0.2** | Catalog and customers | Planned |
| **v0.3** | Inventory and orders with status lifecycle | Planned |
| **v0.4** | Notifications, email, audit log, cron jobs | Planned |
| **v0.5** | Hardening: e2e tests, load testing, production deployment | Planned |
| **Later** | Payments integration, invoicing and PDF export, webhooks, multi-currency, reporting endpoints | Ideas |

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

Check that the container is up with `docker compose ps`, that the port in `DATABASE_URL` matches the one in `docker-compose.yml`, and that no local PostgreSQL is already using the port.

</details>

<details>
<summary><strong>Verification emails never arrive</strong></summary>

<br />

Confirm `RESEND_API_KEY` is set, run `pnpm test:resend`, and make sure the sender address uses a domain verified in your Resend account. Also check the spam folder.

</details>

<details>
<summary><strong>Every request returns 401</strong></summary>

<br />

The access token has expired after 15 minutes. Call `POST /api/auth/refresh` with your refresh token, or log in again.

</details>

<details>
<summary><strong>I get 429 Too Many Requests during testing</strong></summary>

<br />

Raise `THROTTLE_LIMIT` in your local `.env`. Keep the production value conservative.

</details>

<details>
<summary><strong>pnpm blocks a package build script</strong></summary>

<br />

pnpm 10 and newer skip native build scripts until approved. Run `pnpm approve-builds` and select `bcrypt` and Prisma packages.

</details>

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

Contributions follow the [Contributing Guide](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

Orderspace is proprietary software. All rights reserved.

Copyright © 2026 Stephen P. Joseph (`engineerjsp`). See [LICENSE](LICENSE) for the full terms.