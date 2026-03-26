#!/bin/bash

# Smoke Test Script for Health-chain-stellar Backend
# Tests: Boot + Health + Auth Flow
# Usage: ./scripts/smoke-test.sh [BASE_URL]

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
API_PREFIX="${API_PREFIX:-api/v1}"
API_URL="${BASE_URL}/${API_PREFIX}"
TIMEOUT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

# Test 1: Health Check
test_health_check() {
    log_info "Testing health check endpoint..."
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${API_URL}/health" || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        log_success "Health check returned 200 OK"
        return 0
    else
        log_error "Health check failed with status $http_code"
        return 1
    fi
}

# Test 2: Root Endpoint
test_root_endpoint() {
    log_info "Testing root endpoint..."
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${API_URL}/" || echo "000")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Root endpoint returned 200 OK"
        return 0
    else
        log_error "Root endpoint failed with status $http_code"
        return 1
    fi
}

# Test 3: Register User
test_register() {
    log_info "Testing user registration..."
    
    # Generate unique email for test
    TIMESTAMP=$(date +%s)
    TEST_EMAIL="smoketest${TIMESTAMP}@example.com"
    TEST_PASSWORD="TestPass123!"
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
        -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\",
            \"firstName\": \"Smoke\",
            \"lastName\": \"Test\",
            \"phoneNumber\": \"+254700000000\"
        }" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        log_success "User registration successful"
        # Store credentials for login test
        echo "$TEST_EMAIL" > /tmp/smoke_test_email.txt
        echo "$TEST_PASSWORD" > /tmp/smoke_test_password.txt
        return 0
    else
        log_error "User registration failed with status $http_code: $body"
        return 1
    fi
}

# Test 4: Login
test_login() {
    log_info "Testing user login..."
    
    # Read credentials from registration test
    if [ ! -f /tmp/smoke_test_email.txt ]; then
        log_error "No test credentials found. Registration may have failed."
        return 1
    fi
    
    TEST_EMAIL=$(cat /tmp/smoke_test_email.txt)
    TEST_PASSWORD=$(cat /tmp/smoke_test_password.txt)
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
        -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${TEST_EMAIL}\",
            \"password\": \"${TEST_PASSWORD}\"
        }" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        # Extract access token
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$ACCESS_TOKEN" ]; then
            log_success "User login successful, token received"
            echo "$ACCESS_TOKEN" > /tmp/smoke_test_token.txt
            return 0
        else
            log_error "Login succeeded but no access token found"
            return 1
        fi
    else
        log_error "User login failed with status $http_code: $body"
        return 1
    fi
}

# Test 5: Authenticated Request
test_authenticated_request() {
    log_info "Testing authenticated request..."
    
    if [ ! -f /tmp/smoke_test_token.txt ]; then
        log_error "No access token found. Login may have failed."
        return 1
    fi
    
    ACCESS_TOKEN=$(cat /tmp/smoke_test_token.txt)
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT \
        -X GET "${API_URL}/auth/sessions" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Authenticated request successful"
        return 0
    else
        log_error "Authenticated request failed with status $http_code"
        return 1
    fi
}

# Cleanup
cleanup() {
    rm -f /tmp/smoke_test_email.txt
    rm -f /tmp/smoke_test_password.txt
    rm -f /tmp/smoke_test_token.txt
}

# Main execution
main() {
    echo "=========================================="
    echo "  Health-chain-stellar Smoke Test Suite"
    echo "=========================================="
    echo "Target: $API_URL"
    echo "Timeout: ${TIMEOUT}s per request"
    echo ""
    
    # Run tests
    test_health_check
    test_root_endpoint
    test_register
    test_login
    test_authenticated_request
    
    # Cleanup
    cleanup
    
    # Summary
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo "=========================================="
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        exit 1
    fi
}

# Run main
main
