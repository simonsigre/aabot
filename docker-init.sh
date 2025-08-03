#!/bin/sh

# AABot Docker Initialization Script
# This script initializes the database and migrates configuration on first run

set -e

echo "🔧 AABot Docker Initialization"
echo "=============================="

# Wait for database to be fully ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U aabot -d aabot; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npx drizzle-kit push

echo "🎉 Database initialized successfully!"

# Start the application
echo "🚀 Starting AABot application..."
exec node dist/index.js