# Engineering Standards

## Code Quality

- Use TypeScript strict mode
- All functions must have explicit return types
- Use Zod schemas for input validation
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw Promises
- Handle errors with try/catch, log appropriately

## Naming Conventions

- **Files:** kebab-case (`case-detail-panel.tsx`)
- **Components:** PascalCase (`CaseDetailPanel`)
- **Functions:** camelCase (`getCaseById`)
- **Constants:** UPPER_SNAKE_CASE (`MS_PER_DAY`)
- **Types/Interfaces:** PascalCase (`WorkerCase`)

## Security Requirements

- Never log sensitive data (passwords, tokens, PII)
- Validate all user input with Zod schemas
- Use parameterized queries (Drizzle handles this)
- CSRF tokens required for all POST/PUT/DELETE
- JWT tokens must be short-lived
- Rate limit authentication endpoints

## Testing Standards

- Unit tests for business logic in services
- E2E tests for critical user flows
- Test files next to source: `foo.ts` -> `foo.test.ts`
- Use descriptive test names: `it('should return 404 when case not found')`

## API Design

- RESTful endpoints: `GET /api/cases/:id`, `POST /api/cases`
- Return consistent error format: `{ error: string, details?: string }`
- Use appropriate HTTP status codes
- Include pagination for list endpoints

## Database Patterns

- Schema changes go in `shared/schema.ts`
- Run `npm run db:push` after schema changes
- Create migration files for production changes
- Use transactions for multi-table operations

## Logging

- Use `console.log` for info in development
- Use `console.error` for errors
- Include context: `console.error('[Service] Error:', err)`
- Never log full request bodies with sensitive data
