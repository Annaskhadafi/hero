#!/bin/sh
set -e

echo "========================================"
echo " HERO - Dokploy Container Startup"
echo "========================================"

# --- Run Database Migrations ---
echo ""
echo "[1/2] Running database migrations..."

if [ -n "$DATABASE_URL" ]; then
    # Temporarily add migration node_modules to PATH
    export PATH="/app/node_modules_migrate/.bin:$PATH"

    if [ -d "/app/drizzle" ]; then
        NODE_PATH=/app/node_modules_migrate npx drizzle-kit migrate 2>&1 || {
            echo "⚠️  Migration failed - trying push as fallback..."
            NODE_PATH=/app/node_modules_migrate npx drizzle-kit push 2>&1 || {
                echo "❌ Database migration failed. Verify DATABASE_URL and ensure PostgreSQL is reachable."
                exit 1
            }
        }
        echo "✅ Database migrations completed."
    else
        echo "⚠️  No migration files found in /app/drizzle - skipping migrations."
    fi

    unset PATH
else
    echo "⚠️  DATABASE_URL not set - skipping database migrations."
fi

# --- Start Application ---
echo ""
echo "[2/2] Starting Next.js server..."
echo "========================================"
echo ""

exec "$@"