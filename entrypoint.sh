#!/bin/bash
# Entrypoint script for Render deployment

echo "====== Starting Application ======"
echo "Node version: $(node -v)"
echo "Environment: $NODE_ENV"
echo "PORT: $PORT"

# Allow database container time to initialize (important for first deploy)
echo "Waiting for database to initialize..."
sleep 5

# Set up the database with retries
MAX_RETRIES=5
RETRY_COUNT=0
DB_SETUP_SUCCESS=false

cd backend/node

echo "Initializing database (with retries)..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$DB_SETUP_SUCCESS" = false ]; do
  echo "Database setup attempt $((RETRY_COUNT+1))..."
  
  if node setup.js; then
    DB_SETUP_SUCCESS=true
    echo "Database setup successful!"
  else
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "Database setup failed. Waiting 10 seconds before retry..."
      sleep 10
    else
      echo "Database setup failed after $MAX_RETRIES attempts."
      echo "Continuing startup anyway - will retry in the application."
    fi
  fi
done

# Start the application
echo "Starting server on port $PORT..."
exec node server.js 