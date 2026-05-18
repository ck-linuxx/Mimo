# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** None — no test framework installed  
**E2E:** None  
**Coverage:** None

## Test Organization

**Location:** No test files exist in the project  
**Naming:** No convention established  
**Structure:** N/A

## Testing Patterns

### Unit Tests

**Approach:** None  
**Location:** N/A  
No unit tests found in the codebase.

### Integration Tests

**Approach:** None  
**Location:** N/A

### E2E Tests

**Approach:** None  
**Location:** N/A

## Test Execution

**Commands:** None configured in `package.json`  
**Configuration:** None

## Coverage Targets

**Current:** 0% — no tests exist  
**Goals:** Not documented  
**Enforcement:** None

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
|---|---|---|---|
| Pure utils (`utils/`) | unit | N/A — not established | N/A |
| Drizzle hooks (`hooks/`) | integration (SQLite in-memory) | N/A — not established | N/A |
| Form logic (screens) | unit | N/A — not established | N/A |
| Navigation flows | e2e | N/A — not established | N/A |

> All layers currently have **no** test coverage. See `CONCERNS.md` for risk assessment.

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
|---|---|---|---|
| N/A | N/A | N/A | No tests exist |

> If tests are added: Drizzle queries use `expo-sqlite` (device SQLite). For unit testing hooks, an in-memory SQLite approach via `better-sqlite3` or a mock would be needed — `expo-sqlite` is not directly testable in a Node.js environment without mocking.

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | After any change | `bun run lint` |
| Full | Before feature completion | `bun run lint` (only available gate) |
| Build | Before release | `bun run build:apk` |

> No automated test gate exists. The only enforceable quality gate is `bun run lint` (ESLint + Prettier check).
