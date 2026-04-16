#!/bin/sh
set -e

echo "========================================"
echo " HERO - Dokploy Container Startup"
echo "========================================"

# --- Run Database Migrations ---
echo ""
echo "[1/2] Running database migrations..."

if [ -n "$DATABASE_URL" ]; then
    if [ -d "/app/migration" ]; then
        cd /app/migration

        node scripts/run-docker-migrations.mjs
        echo "✅ Database migrations completed."
        
        # Return to app dir
        cd /app
    else
        echo "⚠️  Migration directory not found - skipping migrations."
    fi

else
    echo "⚠️  DATABASE_URL not set - skipping database migrations."
fi

# --- Start Application ---
echo ""
echo "[2/2] Starting Next.js server..."
echo "========================================"
echo ""

exec "$@"
