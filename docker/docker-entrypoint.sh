#!/bin/sh
set -e

echo "========================================"
echo " HERO - Dokploy Container Startup"
echo "========================================"

# --- Run Database Migrations ---
echo ""
echo "[1/2] Running database migrations..."

if [ -n "$DATABASE_URL" ]; then
    DRIZZLE_BIN="/app/node_modules_migrate/.bin/drizzle-kit"

    if [ -d "/app/drizzle" ]; then
        if [ ! -x "$DRIZZLE_BIN" ]; then
            echo "❌ drizzle-kit binary not found in runtime image."
            exit 1
        fi

        # Run migration using the full node_modules and ensuring it can find drizzle-orm
        NODE_PATH=/app/node_modules:/app/node_modules_migrate \
        node /app/node_modules_migrate/drizzle-kit/bin.cjs migrate 2>&1 || {
            echo "⚠️  Migration failed - trying push as fallback..."
            NODE_PATH=/app/node_modules:/app/node_modules_migrate \
            node /app/node_modules_migrate/drizzle-kit/bin.cjs push 2>&1 || {
                echo "❌ Database migration failed. Verify DATABASE_URL and ensure PostgreSQL is reachable."
                exit 1
            }
        }
        echo "✅ Database migrations completed."
    else
        echo "⚠️  No migration files found in /app/drizzle - skipping migrations."
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
