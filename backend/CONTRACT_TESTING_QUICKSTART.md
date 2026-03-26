# Contract Testing Quick Start

## 5-Minute Setup

### 1. Run Contract Tests Locally

```bash
cd backend

# Run all contract tests
npm run test:contracts

# Watch mode for development
npm run test:contracts:watch

# With coverage report
npm run test:contracts:cov
```

### 2. Understanding Test Results

**All green ✅**
```
✓ [CONTRACT] BloodRequests ↔ Inventory (5 tests)
✓ [CONTRACT] Auth Guards ↔ Protected APIs (4 tests)
✓ [CONTRACT] Response Schema Snapshots (8 tests)
```

**Failures ❌**
```
✗ BREAKING: Required field 'reservationId' missing in snapshot v1.0.0
✗ BREAKING: Field 'status' type changed from 'string' to 'number'
```

When you see BREAKING errors, you have a few options:
- **Revert** your change if unintended
- **Bump contract version** if intentional (requires updating consumers)
- **Update snapshot** if adding optional fields

## What Gets Tested

| Test Suite | What's Verified | Why It Matters |
|-----------|-----------------|-----------------|
| Blood Requests ↔ Inventory | Stock reservation format | Prevents double-reservations |
| Blood Requests ↔ Soroban | Blockchain submission format | Prevents failed on-chain records |
| Dispatch ↔ Riders | Rider assignment and state | Prevents double-assignments |
| Auth ↔ Protected Routes | JWT and permission checks | Prevents unauthorized access |
| Schema Snapshots | Response field stability | Prevents breaking API changes |

## Common Scenarios

### Scenario 1: I'm Adding a New Field to a Response

**What happens:**
```
⚠ INFO: New field 'blockchainVerified' added to response
```

**Action:** This is fine! Optional fields are non-breaking. Tests should pass.

**If tests fail:** The field became required in unwanted ways. Review and adjust.

### Scenario 2: I'm Removing a Field from a Response

**What happens:**
```
✗ BREAKING: Required field 'reservationId' removed from snapshot v1.0.0
```

**Action:** DO NOT DO THIS without coordination:
1. Check if any consumer reads this field
2. If yes, coordinate update (consumers first, then remove)
3. If no, bump contract version

### Scenario 3: I'm Changing a Response Status Code

**What happens:**
```
✗ BREAKING: Status mismatch: expected 200, got 201
```

**Action:** Don't change status codes. They're part of the contract.

If you have a good reason (e.g., POST should return 201 not 200):
1. Bump contract version
2. Update all consumers to expect 201
3. Then make the change

### Scenario 4: I'm Changing a Request Parameter Format

**What happens:**
```
✗ BREAKING: Field 'quantity' type changed from 'number' to 'string'
```

**Action:** Same as removing a field—coordinate with providers:
1. Update provider first to accept both formats
2. Then have consumers switch
3. Then remove old format support

## Workflow for Breaking Changes

```
Your PR
  ↓
[Fail] Contract Test Detects Boundary Break
  ↓
Options:
  A) Is this accidental? → Revert change
  B) Is this intentional? → Follow this:
     1. Document why change is needed
     2. Increment contract version in fixture
     3. Update all consumers to match new contract
     4. Commit and request review
     5. Merge after approval
```

## CI/CD Integration

**Automatic on PRs:** Every PR runs contract tests before merge
**Automatic on Push:** Main branch is protected—tests must pass

## Checking Your Changes Against Contracts

### Before Committing

```bash
# 1. Run full test suite including contracts
npm test

# 2. Check specifically for contract breakage
npm run test:contracts

# 3. Review coverage
npm run test:contracts:cov
```

### Interpreting Results

```
PASS  src/__contracts__/auth.contract.spec.ts
PASS  src/__contracts__/blood-requests-inventory.contract.spec.ts
FAIL  src/__contracts__/schema-snapshots.contract.spec.ts

BREAKING: Required field 'id' missing in BloodRequest
```

Find which fixture needs updating:
- `contract-tests/fixtures/blood-requests-inventory.fixture.ts`
- `contract-tests/fixtures/auth.fixture.ts`
- etc.

## Debugging Contract Test Failures

### Failure Type: Response Status Mismatch

```typescript
// Test output:
Status mismatch: expected 200, got 201

// Check:
// 1. Did I change the endpoint status? (grep "status:" in controller)
// 2. Contract expects 200, I'm returning 201
// 3. Options: revert OR bump contract version + update consumers
```

### Failure Type: Schema Field Missing

```typescript
// Test output:
BREAKING: Required field 'bloodType' missing in Inventory response

// Check:
// 1. Did I remove a field? (check InventoryService.ts)
// 2. Is this intentional?
// 3. If yes: bump version + update consumers
// 4. If accidental: restore the field
```

### Failure Type: Type Changed

```typescript
// Test output:
BREAKING: Field 'quantity' type changed from 'number' to 'string'

// Check:
// 1. Did I change the DTO @type decorator? (check *.dto.ts)
// 2. Is the database column type different?
// 3. Revert or bump contract version
```

## Adding Your Own Contract Test

See `CONTRACT_TESTING.md` for the full guide.

Quick example:
```typescript
// 1. Create fixture: contract-tests/fixtures/my-new-contract.fixture.ts
export const MyNewContract = createServiceContract(/* ... */);

// 2. Add to index: contract-tests/fixtures/index.ts
export { MyNewContract } from './my-new-contract.fixture';

// 3. Write test: src/__contracts__/my-new-contract.contract.spec.ts
describe('[CONTRACT] MyService ↔ Provider'), () => {
  // Test interactions match contract
});

// 4. Run tests
npm run test:contracts:watch
```

## Questions?

- **What's a Pact contract?** → See `CONTRACT_TESTING.md`
- **How do I add interacting services not yet covered?** → See `CONTRACT_TESTING.md` Adding New Contracts section
- **CI Failure - what now?** → Check `.github/workflows/contract-tests.yml`
- **I need to change a contract intentionally** → Bump version (e.g., 1.0.0 → 1.1.0) and update all consumers

## Key Commands Reference

```bash
# Run contract tests
npm run test:contracts

# Watch mode (re-run on file change)
npm run test:contracts:watch

# With coverage
npm run test:contracts:cov

# Specific contract
npm run test:contracts -- --testNamePattern="BloodRequests"

# Verbose output
npm run test:contracts -- --verbose

# All tests (including unit/integration)
npm run test

# Full report
npm run test:cov
```

---

**TL;DR:** Contract tests prevent breaking API changes. When tests fail, either fix your code or intentionally bump the contract version and coordinate with consumers. ✅
