# What does this PR do?

<!-- A clear and concise description of the change and why it is needed -->

Closes #<!-- issue number -->

---

## Type of Change

<!-- Check all that apply -->

- [ ] `feat`: New feature
- [ ] `fix`: Bug fix
- [ ] `refactor`: Code change that is neither a feature nor a fix
- [ ] `chore`: Maintenance, dependencies, configuration
- [ ] `docs`: Documentation only
- [ ] `test`: Adding or updating tests

---

## Changes Made

<!-- List the key changes, e.g. "Added inventory adjustment on order cancel" -->

-
-
-

---

## How to Test

<!-- Steps to verify the change, e.g. "Create an order with two line items, confirm it, then check the product stock" -->

1.
2.
3.

---

## Checklist

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes, and new tests cover new behavior
- [ ] Prisma migrations are generated and committed (if the schema changed)
- [ ] Prisma client is regenerated and committed (`src/generated/prisma/`)
- [ ] `.env.example` is updated (if new environment variables were added)
- [ ] README is updated (if setup, behavior, or endpoints changed)
- [ ] No secrets, credentials, or `.env` files are committed
- [ ] New or changed endpoints enforce organization scoping and role guards (if applicable)
- [ ] PR is focused on one feature or fix and targets `dev`
- [ ] Branch follows the naming convention (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`)