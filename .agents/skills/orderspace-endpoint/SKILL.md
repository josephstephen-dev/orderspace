---
name: orderspace-endpoint
description: Scaffold a new API endpoint or feature module in this Orderspace NestJS backend following the repo's conventions. Use when adding a route, controller, service, DTO, or entity, or a whole feature module. Covers guards, RBAC, audit logging, Swagger docs, multi-tenant org resolution, money and stock handling, and the response envelope.
metadata:
  author: Stephen P. Joseph (engineerjsp)
  version: "1.0.0"
  type: project
---

# Orderspace Endpoint / Module

How to add endpoints so they match the existing modules under `src/modules/*`. Read one neighbor module (for example `orders` or `products`) before starting.

## Module layout

```
src/modules/<feature>/
  <feature>.module.ts       # declares controller + service, imports what it needs
  <feature>.controller.ts   # thin: routing, guards, Swagger, DTO binding only
  <feature>.service.ts      # ALL business logic + the only place PrismaService is used
  dto/                      # class-validator DTOs, barrel-exported via index.ts
  entities/                 # Swagger response shapes, barrel-exported
```

Register the module in `src/app.module.ts` `imports`. Inject `PrismaService` into the service (it is provided by the global `PrismaModule`).

## Controller rules

- Keep controllers thin: no business logic, no direct Prisma access.
- Auth is **global** (`JwtAuthGuard` is an `APP_GUARD`), so every route requires a JWT unless you add `@Public()`.
- Get the caller with `@CurrentUser() user: JwtPayload`.
- Decorate with Swagger, because the live `/api/docs` is generated from these: `@ApiTags`, `@ApiBearerAuth('access-token')`, `@ApiOperation`, `@ApiParam`, `@ApiBody`, and the `@Api*Response` decorators. Copy the density of an existing controller.
- Validation is automatic (global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`). Every body must be a class-validator DTO or it will be stripped or rejected.

## Multi-tenancy and RBAC (do not skip)

Any route that touches organization-scoped data must guard the tenant:

```ts
@UseGuards(OrgMemberGuard, RolesGuard)     // caller must be a member of the org
@Roles(MembershipRole.ADMIN)               // plus the minimum role
```

- The guards resolve the organization from the route params **in this order**: `:orgId`, then `:orderId` (via Order), then the generic `:id` (treated as an organization ID). If you introduce a route whose organization cannot be derived from those params, extend `resolveOrgId` in **both** `src/common/guards/org-member.guard.ts` and `src/common/guards/roles.guard.ts` (they mirror each other).
- Role hierarchy: `OWNER(4) > ADMIN(3) > MEMBER(2) > VIEWER(1)`. `@Roles(X)` means "X or higher". The `SUPER_ADMIN` global role bypasses both guards.
- Prefer nesting new resources under the organization, for example `@Controller('organizations/:orgId/products')`, so resolution is automatic and URLs stay predictable.
- **Guards are not enough.** Inside the service, every query on tenant data must also include `organizationId` in its `where` clause. Never trust an ID from the request without checking that it belongs to the organization in the URL. This applies to related IDs inside a body too, such as `customerId` and `productId` on a new order.

## Audit logging

Add `@AuditLog({ entity: 'Order' })` to mutating handlers (POST, PATCH, DELETE). The `AuditLogInterceptor` detects the action from the HTTP method, snapshots before and after, redacts sensitive fields, and writes fire-and-forget. Use `idParam` if the entity id is not `:id`, and `action` to override it (for example `ARCHIVE`, `RESTORE`, `STATUS_CHANGE`).

## Data, money, and stock rules

- **Soft deletes:** organizations, products, customers, and orders use `deletedAt`. Filter `deletedAt: null` on reads and set `deletedAt` instead of hard deleting.
- **Money is `Decimal`.** Never use `number` arithmetic for prices or totals. Use Prisma's `Decimal` for calculations and send it to clients as a string.
- **Price snapshots:** when creating order items, copy the current product price onto the item (`unitPrice`). Never compute historical totals from the live product price.
- **Stock changes only through `InventoryAdjustment` rows.** Do not update `stockQuantity` directly without writing a matching adjustment, so the number is always explainable.
- **Transactions:** any operation that changes stock and order state together (confirm, cancel, refund) must run inside a single `prisma.$transaction`, so a shortage rolls everything back.
- **Order status changes** go through the transition map in the orders service. Reject illegal transitions with `UnprocessableEntityException` and write an `OrderStatusHistory` row for every successful transition.
- **Order numbers** are sequential per organization and are allocated inside the same transaction that creates the order.
- **SKU uniqueness** is per organization. Catch the unique constraint error and return `ConflictException`.
- Import enums from `src/generated/prisma/enums` and model types from `src/generated/prisma/models`. After any `prisma/schema.prisma` change, run `pnpm prisma:generate`.
- Every response is auto-wrapped by `TransformInterceptor` as `{ data, meta: { timestamp } }`. Return the raw entity or DTO from the controller and do not wrap it yourself.

## Skeleton

Controller:

```ts
@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/products')
export class ProductsController {
    constructor(private readonly products: ProductsService) {}

    @Post()
    @UseGuards(OrgMemberGuard, RolesGuard)
    @Roles(MembershipRole.ADMIN)
    @AuditLog({ entity: 'Product' })
    @ApiOperation({ summary: 'Create a product' })
    @ApiCreatedResponse({ type: ProductEntity })
    @ApiConflictResponse({ description: 'SKU already exists in this organization' })
    create(
        @Param('orgId') orgId: string,
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateProductDto,
    ) {
        return this.products.create(orgId, user.sub, dto);
    }
}
```

Service (tenant-scoped, with conflict handling):

```ts
async create(orgId: string, userId: string, dto: CreateProductDto) {
    try {
        return await this.prisma.product.create({
            data: { ...dto, organizationId: orgId },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('A product with this SKU already exists');
        }
        throw error;
    }
}

async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
        where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
}
```

## Before you finish

Run `pnpm type-check && pnpm lint && pnpm build` (the CI gates). Add Swagger response decorators for every status the endpoint can return. Add or update tests following the `orderspace-testing` skill, and update the API reference in `README.md`.