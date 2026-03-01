# Database Rules

## Drizzle ORM

This project uses Drizzle ORM with PostgreSQL. Schema is defined in `shared/schema.ts`.

## Schema Changes

1. Modify `shared/schema.ts`
2. Run `npm run drizzle:generate` for migration file
3. Run `npm run db:push` to apply changes
4. Test locally before committing

## Table Naming

- Use snake_case: `worker_cases`, `medical_certificates`
- Singular for join tables: `case_attachment`
- Use meaningful prefixes: `termination_processes`

## Column Conventions

```typescript
// Standard columns
id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow(),

// Foreign keys with cascade
caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),

// JSON columns for complex data
clinicalStatusJson: jsonb("clinical_status_json").$type<CaseClinicalStatus | null>(),
```

## Query Patterns

```typescript
// Simple select
const cases = await db.select().from(workerCases);

// With conditions
const case = await db.select()
  .from(workerCases)
  .where(eq(workerCases.id, id))
  .limit(1);

// Join
const withCerts = await db.select()
  .from(workerCases)
  .leftJoin(medicalCertificates, eq(workerCases.id, medicalCertificates.caseId));

// Insert
const result = await db.insert(workerCases).values(data).returning();

// Update
await db.update(workerCases)
  .set({ status: 'completed' })
  .where(eq(workerCases.id, id));
```

## Performance

- Add indexes for frequently queried columns
- Use `limit()` for large result sets
- Avoid N+1 queries with joins
- Use transactions for multi-step operations

## Security

- Always use parameterized queries (Drizzle handles this)
- Validate input with Zod before database operations
- Never expose internal database errors to clients
- Log database errors server-side only
