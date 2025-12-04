#!/bin/sh
# Production startup script

# Wait for any initialization if needed
echo "Starting Code and Conquer Backend..."

# Check required environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo "Warning: SUPABASE_URL is not set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Warning: SUPABASE_SERVICE_ROLE_KEY is not set"
fi

if [ -z "$CLIENT_URL" ]; then
    echo "Warning: CLIENT_URL is not set, using default"
fi

# Start the application
exec node src/index.js

