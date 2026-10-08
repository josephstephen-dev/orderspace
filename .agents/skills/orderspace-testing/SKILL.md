---
name: orderspace-testing
description: Write Jest unit and e2e tests for this Orderspace NestJS + Prisma backend. Use when adding or updating tests for services, controllers, guards, interceptors, or cron jobs, or when setting up e2e coverage. Covers the repo's testing config, PrismaService mocking, transactions, tenant isolation, the order state machine, and guard/RBAC testing patterns.
metadata:
  author: Stephen P. Joseph (engineerjsp)
  version: "1.0.0"
  type: project
---

# Orderspace Testing

Testing conventions for this repository. There are currently no committed tests, so follow these patterns to keep new tests consistent.

## Setup and running

- **Runner:** Jest via `ts-jest`. Config for unit tests lives in `package.json` (`jest` key): `rootDir: src`, `testRegex: .*\.spec\.ts$`. E2e config is `test/jest-e2e.json` (`testRegex: .e2e-spec.ts$`).
- **Unit tests** live next to the code they test: `src/modules/orders/orders.service.spec.ts`.
- **E2e tests** live in `test/` as `*.e2e-spec.ts`.

```bash
pnpm test                                              # all unit tests
pnpm test -- src/modules/orders/orders.service.spec.ts # single file
pnpm test -- -t "rejects an illegal transition"        # by test name
pnpm test:cov                                          # coverage
pnpm test:e2e                                          # e2e suite
```

## Unit-testing a service (the common case)

Services are the only layer with real logic, so they are the priority. Build the module with `Test.createTestingModule` and provide a **mocked `PrismaService`**. Do NOT hit a real database in unit tests.

```ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
    let service: OrdersService;

    const prisma = {
        order: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        product: { findMany: jest.fn(), update: jest.fn() },
        inventoryAdjustment: { create: jest.fn() },
        orderStatusHistory: { create: jest.fn() },
        // $transaction runs the callback with the same mock client
        $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
        // add only the delegates and methods the test touches
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();
        service = moduleRef.get(OrdersService);
    });

    it('throws NotFoundException when the order is soft-deleted', async () => {
        prisma.order.findFirst.mockResolvedValue(null);
        await expect(service.findOne('org-1', 'missing')).rejects.toThrow(
            NotFoundException,
        );
    });
});
```

Guidance:

- Mock **only** the Prisma delegates and methods the code under test calls. Keep the mock minimal and loosely typed (`as unknown as PrismaService` if TypeScript complains).
- Assert on the Nest exceptions services throw: `NotFoundException`, `ForbiddenException`, `ConflictException`, `BadRequestException`, `UnprocessableEntityException`.
- Remember the **soft-delete** contract: services filter `deletedAt: null`. Test that soft-deleted rows are treated as absent.
- Remember the **tenant** contract: every query includes `organizationId`. Assert on the `where` passed to Prisma, not only on the return value.

## What to test in Orderspace specifically

**Tenant isolation**

- A product, customer, or order that belongs to another organization is treated as not found.
- Creating an order with a `customerId` or `productId` from a different organization is rejected.

**Order state machine**

- Every allowed transition succeeds and writes an `OrderStatusHistory` row.
- Illegal transitions (for example `DRAFT` to `SHIPPED`, or anything out of `CANCELLED`) throw `UnprocessableEntityException` and change nothing.

**Stock and transactions**

- Confirming an order decrements stock and writes one `InventoryAdjustment` per line.
- If any line has insufficient stock, the operation throws and no stock or status change is persisted. With the mock, assert that `product.update` and `orderStatusHistory.create` were not called.
- Cancelling a confirmed order restores stock.
- Assert that confirm, cancel, and refund call `prisma.$transaction`.

**Money**

- Totals are computed with `Decimal`, not floats. Use values that expose float errors, such as `0.1` and `0.2`, and assert exact results like `'0.30'`.
- Line items store the `unitPrice` snapshot, and a later product price change does not alter an existing order.

**Uniqueness**

- A duplicate SKU in the same organization throws `ConflictException`. Simulate it by making the mock reject with a `Prisma.PrismaClientKnownRequestError` with code `P2002`.
- The same SKU in a different organization is allowed.

## Testing guards and RBAC

Guards (`JwtAuthGuard`, `OrgMemberGuard`, `RolesGuard`) encode the multi-tenancy rules, so they are worth direct tests. Fake the `ExecutionContext`:

```ts
const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => OrdersController,
} as unknown as ExecutionContext;
```

Cover:

- Missing or invalid JWT throws `UnauthorizedException`.
- A non-member throws `ForbiddenException`.
- The `SUPER_ADMIN` bypass returns `true`.
- Role hierarchy (`OWNER > ADMIN > MEMBER > VIEWER`): a `VIEWER` must be rejected where `@Roles(MEMBER)` is required, and a `MEMBER` rejected where `@Roles(ADMIN)` is required.
- Organization resolution from `:orgId`, from `:orderId` (through the Order lookup), and from a generic `:id`.

Provide a mocked `PrismaService` for the `membership.findUnique` and organization-resolution calls, and a mocked `Reflector` for route metadata.

## Cron jobs

Test the job's `run` method directly instead of waiting for the schedule. Mock `PrismaService`, the notifications service, and the email service. Examples: the invitation expiry job only updates invitations whose `expiresAt` has passed, and the low-stock job only notifies for products at or below their threshold.

## E2e tests

Bootstrap the app the same way `main.ts` does (global `/api` prefix, `ValidationPipe`, global guards) so behavior matches production, then drive it with `supertest`. Use a dedicated test database and reset it between runs (`pnpm prisma:migrate:reset`). Never point e2e tests at a shared or production database. Responses are wrapped by `TransformInterceptor`, so assert on `res.body.data`, not the raw entity.

## Checklist for a new service test

- [ ] Happy path returns the expected shape
- [ ] Not-found or soft-deleted resource throws the correct exception
- [ ] Resource from another organization is treated as not found
- [ ] Permission or ownership violations throw `ForbiddenException`
- [ ] Uniqueness and conflict paths throw `ConflictException`
- [ ] Illegal state transitions throw `UnprocessableEntityException`
- [ ] Multi-step changes run inside `$transaction` and roll back on failure
- [ ] Prisma mock assertions check the `where` and `data` passed (especially `organizationId` and `deletedAt: null`)