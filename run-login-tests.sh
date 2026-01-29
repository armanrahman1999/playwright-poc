#!/bin/bash

# Blocks Cloud Login Page Test Runner
# This script runs Playwright tests against https://cloud.seliseblocks.com/login

echo "🚀 Starting Blocks Cloud Login Page Tests"
echo "=========================================="
echo ""
echo "Target: https://cloud.seliseblocks.com/login"
echo "Test File: tests/example.spec.ts"
echo ""

# Run the tests
npx playwright test tests/example.spec.ts --headed=false

echo ""
echo "✅ Tests completed"
echo "📁 Results: test-results/"
echo ""
