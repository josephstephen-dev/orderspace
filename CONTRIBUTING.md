# Contributing to Orderspace

Thank you for helping improve Orderspace. This guide explains how to set up the project, how we work, and what a good pull request looks like.

By taking part, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

- [Before You Start](#before-you-start)
- [Local Setup](#local-setup)
- [Workflow at a Glance](#workflow-at-a-glance)
- [Branching](#branching)
- [Commit Messages](#commit-messages)
- [Coding Standards](#coding-standards)
- [Adding a Feature Module](#adding-a-feature-module)
- [Working with the Database](#working-with-the-database)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Review Process](#review-process)
- [Reporting Issues](#reporting-issues)
- [Getting Help](#getting-help)

---

## Before You Start

Orderspace is proprietary software. Contributions are accepted from people who have been given access to the repository. If you are unsure whether you may contribute, contact the maintainer first.

For anything larger than a small fix, open an issue or start a conversation before writing code. It avoids duplicated effort and keeps the design consistent.

## Local Setup

**Requirements:** Node.js 22 or newer, Docker, and Git.

```bash
# 1. Clone the repository (or your fork)
git clone https://github.com/josephstephen-dev/orderspace.git
cd orderspace

# 2. Enable the pinned package manager and install dependencies
corepack enable
pnpm install

# 3. Create your environment file and fill in the values
cp .env.example .env

# 4. Start PostgreSQL
docker compose up -d

# 5. Generate the Prisma client and apply migrations
pnpm prisma:generate
pnpm prisma:migrate

# 6. Start the API in watch mode
pnpm start:dev
```

The API runs at `http://localhost:3000/api` and the Swagger docs at `http://localhost:3000/api/docs`.

> This project uses **pnpm only**. Please do not use npm or yarn, because they would produce a different lockfile.

## Workflow at a Glance

```
fork or branch  ->  code  ->  checks pass locally  ->  pull request into dev  ->  review  ->  squash merge
```

## Branching

Create your branch from `dev`. Pull requests target `dev`. Only release merges go into `main`.

| Prefix | Use for |
|---|---|
| `feat/` | A new feature |
| `fix/` | A bug fix |
| `chore/` | Maintenance, dependencies, configuration |
| `docs/` | Documentation only |
| `refactor/` | A code change that neither fixes a bug nor adds a feature |
| `test/` | Adding or updating tests |

Examples:

```text
feat/order-status-history
fix/stock-rollback-on-cancel
docs/update-api-reference
chore/upgrade-prisma
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org).

```text
<type>(optional scope): short description
```

Examples:

```text
feat(orders): add refund endpoint for delivered orders
fix(inventory): prevent negative stock on concurrent confirmation
refactor(auth): extract token rotation into its own method
test(orders): cover illegal status transitions
docs(readme): document the order lifecycle
chore(deps): upgrade nestjs packages
```

Rules:

- Use lowercase and the present tense: "add" not "added"
- Keep the subject line under 72 characters
- Explain the why in the body when it is not obvious
- Reference issues when relevant: `fix(auth): handle token expiry (#42)`

## Coding Standards

| Area | Rule |
|---|---|
| **Language** | TypeScript in strict mode. Avoid `any`. |
| **Layering** | Controllers bind input, apply guards, and call a service. Business logic and every Prisma query live in services. |
| **Validation** | Every request body and query is a DTO with `class-validator` decorators. |
| **API docs** | Every endpoint has `@ApiTags`, `@ApiOperation`, and response decorators. Swagger is generated from them. |
| **Tenancy** | Every query on tenant data must be scoped by organization. Never trust an ID from the request without checking it belongs to the organization. |
| **Deletes** | Prefer soft delete with `deletedAt`, and filter `deletedAt: null` on reads. |
| **Money** | Use `Decimal`. Never use floating point for prices or totals. |
| **Atomic changes** | Operations that change stock and order state together must run in one database transaction. |
| **Style** | Follow the existing code. Prettier and ESLint settings are in the repository. |

Run the formatter and linter before committing:

```bash
pnpm format
pnpm lint
```

## Adding a Feature Module

Each module follows the same structure so the codebase stays predictable.

```text
src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── dto/
│   ├── create-<feature>.dto.ts
│   └── update-<feature>.dto.ts
└── entities/
    └── <feature>.entity.ts
```

Checklist for a new endpoint:

1. Add or update the DTOs with validation rules.
2. Implement the logic in the service, scoped by organization.
3. Add the controller route with Swagger decorators.
4. Protect it with `OrgMemberGuard` and `@Roles(...)`, or mark it `@Public()` if it truly is open.
5. Add `@AuditLog({ entity: '...' })` to mutating routes.
6. Write tests for the service.
7. Update the API reference in the README.

## Working with the Database

- The schema lives in `prisma/schema.prisma`.
- After any schema change, run `pnpm prisma:generate`. The generated client is committed under `src/generated/prisma/`, so commit it with your change.
- Create a migration with `pnpm prisma:migrate` and give it a descriptive name.
- Never edit a migration that has already been merged. Add a new one instead.
- Never use `pnpm prisma:migrate:reset` on a shared or production database.

## Testing

```bash
pnpm test          # unit tests
pnpm test:watch    # re-run on change
pnpm test:cov      # with coverage
pnpm test:e2e      # end-to-end tests
```

Run a single file or a single test by name:

```bash
pnpm test -- src/modules/orders/orders.service.spec.ts
pnpm test -- -t "should reject an illegal status transition"
```

New behavior should come with tests. Bug fixes should include a test that fails without the fix.

## Pull Requests

Before opening a pull request, make sure all of these pass locally. CI runs the same checks.

```bash
pnpm prisma:generate
pnpm type-check
pnpm lint
pnpm build
pnpm test
```

A good pull request:

- Does one thing and stays focused
- Targets `dev`
- Has a clear title that follows the commit convention
- Explains what changed and why, with screenshots or example requests when useful
- Links the related issue, for example `Closes #42`
- Includes tests and documentation updates
- Contains no secrets, no `.env` files, and no unrelated formatting changes

## Review Process

1. CI must pass.
2. At least one maintainer reviews the change.
3. Feedback is addressed with new commits. Please do not force-push during review.
4. A maintainer squash merges the pull request into `dev`.

## Reporting Issues

- Search existing issues first.
- Use the issue templates when they are available.
- Include steps to reproduce, expected behavior, actual behavior, and your environment.
- **Security vulnerabilities must not be reported in public issues.** Follow [SECURITY.md](SECURITY.md) instead.

## Getting Help

Contact the maintainer, Stephen P. Joseph (`engineerjsp`), at [josephstep486@gmail.com](mailto:josephstep486@gmail.com) or through [GitHub](https://github.com/josephstephen-dev).

Thank you for helping make Orderspace better.