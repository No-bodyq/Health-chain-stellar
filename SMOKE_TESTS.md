# Smoke Tests

Minimal end-to-end tests to verify the backend is functioning correctly.

## What is Tested

The smoke test suite validates:

1. **Boot**: Application starts successfully
2. **Health**: Health check endpoint responds
3. **Auth Flow**: Complete authentication workflow
   - User registration
   - User login
   - Authenticated requests

## Running Locally

### Prerequisites

- Backend running on `http://localhost:3000` (or specify custom URL)
- Database and Redis available

### Quick Start

```bash
# Start dependencies
docker-compose up -d

# Start backend in another terminal
cd backend
npm run start:dev

# Run smoke tests
./scripts/smoke-test.sh
```

### Custom URL

```bash
./scripts/smoke-test.sh http://localhost:4000
```

### Custom API Prefix

```bash
API_PREFIX=api/v2 ./scripts/smoke-test.sh
```

## CI/CD Integration

Smoke tests run automatically:

- **On Pull Requests**: Validates changes don't break core functionality
- **Nightly**: Scheduled run at 2 AM UTC to catch environment issues
- **Manual**: Can be triggered via GitHub Actions UI

### GitHub Actions Workflow

See `.github/workflows/smoke-tests.yml` for the complete CI configuration.

The workflow:
1. Spins up Postgres and Redis services
2. Builds and starts the backend
3. Runs the smoke test script
4. Reports results

## Test Output

Successful run:
```
==========================================
  Health-chain-stellar Smoke Test Suite
==========================================
Target: http://localhost:3000/api/v1
Timeout: 5s per request

[INFO] Testing health check endpoint...
[PASS] Health check returned 200 OK
[INFO] Testing root endpoint...
[PASS] Root endpoint returned 200 OK
[INFO] Testing user registration...
[PASS] User registration successful
[INFO] Testing user login...
[PASS] User login successful, token received
[INFO] Testing authenticated request...
[PASS] Authenticated request successful

==========================================
  Test Summary
==========================================
Passed: 5
Failed: 0
==========================================
All tests passed!
```

## Troubleshooting

### Connection Refused

Ensure the backend is running:
```bash
curl http://localhost:3000/api/v1/health
```

### Database Errors

Check database connection:
```bash
docker-compose ps
docker-compose logs postgres
```

### Authentication Failures

Check backend logs for detailed error messages:
```bash
# If using npm run start:dev
# Check terminal output

# If using Docker
docker-compose logs backend
```

## Extending Tests

To add more smoke tests, edit `scripts/smoke-test.sh`:

```bash
# Add new test function
test_new_feature() {
    log_info "Testing new feature..."
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
        "${API_URL}/new-endpoint")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "New feature test passed"
        return 0
    else
        log_error "New feature test failed"
        return 1
    fi
}

# Call it in main()
main() {
    # ... existing tests ...
    test_new_feature
    # ...
}
```

## Best Practices

- Keep tests fast (< 30 seconds total)
- Test critical paths only
- Use unique test data (timestamps) to avoid conflicts
- Clean up test data after runs
- Make tests idempotent (can run multiple times)
