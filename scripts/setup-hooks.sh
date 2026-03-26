#!/bin/bash

# Setup script for pre-commit hooks
# Run this after cloning the repository

set -e

echo "=========================================="
echo "  Setting up pre-commit hooks"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "Error: Must run from project root directory"
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="
echo ""
echo "Pre-commit hooks are now active."
echo "They will run automatically on 'git commit'."
echo ""
echo "To bypass hooks when needed:"
echo "  git commit --no-verify"
echo ""
echo "See PRE_COMMIT_HOOKS.md for more information."
