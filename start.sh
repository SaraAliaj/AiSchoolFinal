#!/usr/bin/env bash
# Start script for Render deployment

# Exit on error
set -e

echo "Start script is running..."
echo "Current directory: $(pwd)"
echo "PORT environment variable: $PORT"

cd backend/node

# Print environment variables (excluding passwords)
echo "Environment variables:"
printenv | grep -v PASSWORD | grep -v SECRET

# Fix database module issue
echo "Running database module fix script..."
node fix-database-module.js || echo "Database module fix failed or not needed"

# Initialize the database if needed (with retry logic)
echo "Checking and initializing database..."
MAX_RETRIES=5
RETRY_COUNT=0
DB_INIT_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$DB_INIT_SUCCESS" = false ]; do
  echo "Database initialization attempt $((RETRY_COUNT+1))..."
  if node init-db.js; then
    echo "Database initialization successful!"
    DB_INIT_SUCCESS=true
  else
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "Database initialization failed. Retrying in 5 seconds..."
      sleep 5
    else
      echo "Database initialization failed after $MAX_RETRIES attempts. Continuing anyway..."
    fi
  fi
done

# Start the server - the server has its own connection retry logic
echo "Starting Node.js server on PORT $PORT"
node server.js 