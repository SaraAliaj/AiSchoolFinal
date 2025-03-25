#!/usr/bin/env bash
# Build script for Render deployment

# Exit on error
set -e

echo "Build script started"

# Install dependencies
echo "Installing node backend dependencies..."
cd backend/node
npm install

# Log important environment information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Working directory: $(pwd)"
echo "PORT: $PORT"
echo "Environment variables:"
printenv | grep -v PASSWORD | grep -v SECRET

echo "Build script completed successfully" 