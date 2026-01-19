# TypeScript Rules

## Strict Configuration

This project uses TypeScript strict mode. All code must:
- Have explicit return types on functions
- Handle null/undefined properly
- Use proper type narrowing

## Type Definitions

- Database types are inferred from Drizzle schema in `shared/schema.ts`
- Use `*DB` suffix for database row types: `WorkerCaseDB`
- Use `Insert*` prefix for insert types: `InsertWorkerCase`
- Frontend types often mirror backend but may omit internal fields

## Common Patterns

```typescript
// API handler with proper typing
app.get("/api/cases/:id", async (req: Request, res: Response) => {
  const caseId = req.params.id;
  // ... handler logic
});

// Service function with return type
async function getCaseById(id: string): Promise<WorkerCase | null> {
  // ... implementation
}

// Zod validation
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

## Import Organization

1. External packages (react, express)
2. Internal absolute imports (@shared/schema)
3. Relative imports (./components)
4. Type-only imports last

## Avoid

- `any` type (use `unknown` if needed)
- Type assertions without validation
- Non-null assertions (`!`) without checks
- Implicit return types on exported functions
