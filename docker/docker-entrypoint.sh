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
        
        npx drizzle-kit migrate 2>&1 || {
            echo "⚠️  Migration failed - trying push as fallback..."
            npx drizzle-kit push 2>&1 || {
                echo "❌ Database migration failed. Verify DATABASE_URL and ensure PostgreSQL is reachable."
                exit 1
            }
        }
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
