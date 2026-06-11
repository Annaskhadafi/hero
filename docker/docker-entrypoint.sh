#!/bin/sh
set -e

echo "========================================"
echo " HERO - Dokploy Container Startup"
echo "========================================"

# --- Run Database Migrations ---
echo ""
echo "[1/2] Running database migrations..."

if [ "$RUN_MIGRATIONS" = "true" ] && { [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_URL" ] || [ -n "$POSTGRES_PRISMA_URL" ] || [ -n "$POSTGRESQL_URL" ] || [ -n "$DATABASE_PUBLIC_URL" ]; }; then
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
    echo "⚠️  RUN_MIGRATIONS=true or database URL not set - skipping database migrations."
fi

# --- Start Application ---
echo ""
echo "[2/2] Starting Next.js server..."
echo "========================================"
echo ""

exec "$@"
