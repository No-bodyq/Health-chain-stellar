# Contract Testing Documentation

## Overview

This project implements **Pact-style contract testing** with **schema snapshot validation** to prevent breaking changes at API module boundaries.

### What This Solves

Traditional integration tests verify two services work together with one specific implementation. Contract tests verify that:

1. **Service boundaries don't break** - Consumers and providers agree on request/response formats
2. **Schema changes are tracked** - Breaking field changes are immediately detected
3. **API contracts are versioned** - Changes require explicit version bumps and provider updates
4. **CI detects violations** - Every PR validates module boundaries

## Architecture

### Critical Module Boundaries Tested

| Consumer | Provider | What's Tested |
|----------|----------|---------------|
| BloodRequests | Inventory | Stock reservation request/response format |
| BloodRequests | Soroban | Transaction submission & idempotency |
| Dispatch | Riders | Order assignment & rider state transitions |
| Auth | All Protected APIs | JWT token validation & permission checks |
| All APIs | - | Response schema stability |

## Directory Structure

```
backend/
├── contract-tests/              # Contract testing utilities
│   ├── fixtures/                # Frozen pact contracts
│   │   ├── index.ts
│   │   ├── blood-requests-inventory.fixture.ts
│   │   ├── blood-requests-soroban.fixture.ts
│   │   ├── dispatch-riders.fixture.ts
│   │   └── auth.fixture.ts
│   └── utils/                   # Contract testing helpers
│       ├── interaction-matcher.ts      # Pact validation
│       ├── schema-snapshot.matcher.ts  # Schema validation
│       └── test-helpers.ts             # Test utilities
│
└── src/
    └── __contracts__/           # Contract test suites
        ├── blood-requests-inventory.contract.spec.ts
        ├── auth.contract.spec.ts
        ├── schema-snapshots.contract.spec.ts
        └── ...
```

## Contract Test Types

### 1. Pact-Style Interaction Tests

**Purpose**: Validate service-to-service interactions match frozen contracts

```typescript
import { BloodRequestsInventoryContract } from '../../contract-tests/fixtures';
import { validateInteraction } from '../../contract-tests/utils/interaction-matcher';

it('should match contract when reserving stock', () => {
  const actualRequest = {
    method: 'POST',
    path: '/inventory/reserve',
    body: { bloodType: 'A+', quantity: 5, bloodBankId: 'bank-001' },
  };

  const actualResponse = {
    status: 200,
    body: { success: true, reservationId: 'RES-12345', ...},
  };

  const validation = validateInteraction(
    actualRequest,
    actualResponse,
    BloodRequestsInventoryContract.interactions[0],
  );

  expect(validation.valid).toBe(true);
});
```

### 2. Schema Snapshot Tests

**Purpose**: Lock response schema to detect breaking field changes

```typescript
import { createSnapshot, validateAgainstSnapshot } from '../../contract-tests/utils/schema-snapshot.matcher';

const response = { id: '123', name: 'Hospital', beds: 100 };
const snapshot = createSnapshot('Hospital', '1.0.0', response);

// Later: validate new responses against frozen schema
const validation = validateAgainstSnapshot(newResponse, snapshot);
// ❌ BREAKING: Required field 'beds' removed
// ❌ BREAKING: Field 'id' type changed from string to number
```

## Adding a New Contract Test

### Step 1: Define the Fixture

Create a new fixture file in `contract-tests/fixtures/`:

```typescript
// contract-tests/fixtures/my-service.fixture.ts
import { createInteraction, createServiceContract } from '../utils/interaction-matcher';

export const MyServiceInteraction = createInteraction(
  'Do something',
  'ConsumerService',
  'ProviderService',
  {
    method: 'POST',
    path: '/provider/endpoint',
    body: { /* expected request */ },
  },
  {
    status: 200,
    body: { /* expected response */ },
  },
);

export const MyServiceContract = createServiceContract(
  'Consumer-Provider',
  '1.0.0',
  [MyServiceInteraction, /* more interactions */],
);
```

### Step 2: Add to Fixtures Index

Update `contract-tests/fixtures/index.ts`:

```typescript
export {
  MyServiceContract,
  MyServiceInteraction,
} from './my-service.fixture';

export const CRITICAL_CONTRACTS = [
  // ... existing
  MyServiceContract,
];
```

### Step 3: Create Test Suite

Create a test file in `src/__contracts__/`:

```typescript
// src/__contracts__/my-service.contract.spec.ts
import { MyServiceContract, MyServiceInteraction } from '../../contract-tests/fixtures';
import { validateInteraction } from '../../contract-tests/utils/interaction-matcher';

describe('[CONTRACT] Consumer ↔ Provider', () => {
  it('should match contract', () => {
    const validation = validateInteraction(actualReq, actualRes, MyServiceInteraction);
    expect(validation.valid).toBe(true);
  });

  it('should detect breaking changes', () => {
    // Test with mutations to detect what breaks
    // Status code changes, field removals, type changes, etc.
  });
});
```

## Running Contract Tests

### Locally

```bash
# Run all contract tests
npm run test -- --testPathPattern='__contracts__'

# Run specific contract
npm run test -- --testPathPattern='blood-requests'

# Run with coverage
npm run test:cov -- --testPathPattern='__contracts__'

# Watch mode
npm run test:watch -- --testPathPattern='__contracts__'
```

### In CI

Contract tests run automatically on every PR and push to `main`/`develop` (see `.github/workflows/contract-tests.yml`).

**Triggers:**
- Any change to `backend/src/**`
- Any change to `backend/contract-tests/**`
- Any change to `backend/package.json`

## Breaking Changes & Versioning

### When Changes Require Breaking Version Bump

1. **Response field removed** → Breaking (consumers may read it)
2. **Response field type changed** → Breaking (consumers expect original type)
3. **Required request field added** → Breaking (consumers don't send it)
4. **HTTP status code changed** → Breaking (consumers expect original code)
5. **Required response field removed** → Breaking (consumers expect it)

### How to Bump Contract Version

```typescript
// Update fixture
export const MyServiceContract = createServiceContract(
  'Consumer-Provider',
  '1.1.0',  // ← Bump version
  [/* updated interactions */],
);
```

**Then:**
1. Update all **consumers** to handle the new contract
2. Update all **providers** to implement the new contract
3. Test in staging before merging

## Assertion Errors & Debugging

### Error: "BREAKING: Required field 'X' missing"

Your response removed a field that the contract expects. Either:
- **Option A**: Don't remove the field (keep backward compatibility)
- **Option B**: Bump contract version and update consumers first

### Error: "Type mismatch at path.Y: expected string, got number"

Your response changed a field's type. Either:
- **Option A**: Keep the original type
- **Option B**: Bump contract version and coordinate with consumers

### Error: "Status mismatch: expected 200, got 201"

Your endpoint returns a different HTTP status. Either:
- **Option A**: Keep original status
- **Option B**: Bump contract version and update consumers

## Contract Testing Best Practices

1. **Keep contracts minimal** - Only test the critical happy path and common errors
2. **One fixture per boundary** - Don't mix multiple service pairs in one fixture
3. **Version everything** - Always include contract version; increment on breaking changes
4. **Update both sides** - Changes to provider must be coordinated with consumer updates
5. **Test error cases** - Include error scenarios in contracts (400, 401, 403, 409, etc.)
6. **Document reasons** - Use clear contract names explaining why this boundary matters

## CI Integration

### Contract Test Workflow

1. Run all contract tests on PR
2. Check for breaking changes (violations fail the build)
3. Post PR comment with results
4. Upload coverage artifact
5. Require passing checks before merge

### Accessing Results

- **Local** → Terminal output
- **GitHub PR** → Automated comment with test summary
- **GitHub Actions** → Full logs in workflow run
- **Artifacts** → Coverage reports in Actions tab

## Troubleshooting

### Tests timeout in CI

Increase timeout in workflow or add `--detectOpenHandles --forceExit` (already configured).

### State leaks between tests

Use `beforeEach` to reset mocks:

```typescript
beforeEach(() => {
  mockProvider.reset();
});
```

### Contract version conflicts

- **Local dev** → Update fixture version, update test expectations
- **On main** → Create hotfix PR, bump version again, document in changelog

## Examples

See test files for complete examples:
- `src/__contracts__/blood-requests-inventory.contract.spec.ts`
- `src/__contracts__/auth.contract.spec.ts`
- `src/__contracts__/schema-snapshots.contract.spec.ts`

## Questions?

- **Contract testing basics** → See `contract-tests/utils/` for detailed API docs
- **NestJS + Pact** → Check existing test suites in `src/__contracts__/`
- **CI/CD integration** → Review `.github/workflows/contract-tests.yml`
