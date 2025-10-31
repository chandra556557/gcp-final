#!/bin/bash

# Playwright CRX – Red Hat + Cloud SQL Migration Script
# Purpose: Apply database migrations against a Google Cloud SQL Postgres instance
# from a Red Hat (RHEL) VM, using either Cloud SQL Auth Proxy or private IP.
#
# Usage (Proxy):
#   export CONNECTION_METHOD=proxy
#   export CLOUDSQL_INSTANCE="<PROJECT>:<REGION>:<INSTANCE>"
#   export SA_KEY_FILE="/path/to/service-account.json"
#   export DB_NAME="playwright_crx"
#   export DB_USER="playwright_user"
#   export DB_PASSWORD="playwright123"
#   ./scripts/migrate-cloudsql-redhat.sh
#
# Usage (Private IP):
#   export CONNECTION_METHOD=private
#   export DB_HOST="10.x.x.x"   # Cloud SQL private IP
#   export DB_PORT="5432"
#   export DB_NAME="playwright_crx"
#   export DB_USER="playwright_user"
#   export DB_PASSWORD="playwright123"
#   ./scripts/migrate-cloudsql-redhat.sh
#
# Optional:
#   export CREATE_DB_IF_MISSING=true
#   export DB_ADMIN_USER=postgres
#   export DB_ADMIN_PASSWORD="<admin password>"
#   export DB_SCHEMA=public     # Defaults to public
#   export SSL_MODE=require     # If you need Prisma to enforce SSL
#   export BACKEND_DIR="playwright-crx-enhanced/backend"
#
set -euo pipefail

log() { printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*"; }

# Config
CONNECTION_METHOD=${CONNECTION_METHOD:-proxy}   # proxy | private
CLOUDSQL_INSTANCE=${CLOUDSQL_INSTANCE:-}
SA_KEY_FILE=${SA_KEY_FILE:-}
LOCAL_PORT=${LOCAL_PORT:-5432}
DB_NAME=${DB_NAME:-playwright_crx}
DB_USER=${DB_USER:-playwright_user}
DB_PASSWORD=${DB_PASSWORD:-playwright123}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-$LOCAL_PORT}
DB_SCHEMA=${DB_SCHEMA:-public}
SSL_MODE=${SSL_MODE:-}
BACKEND_DIR=${BACKEND_DIR:-playwright-crx-enhanced/backend}

log "Starting Cloud SQL migration on Red Hat..."
log "Connection method: $CONNECTION_METHOD"

# Ensure basic tools
if ! command -v psql >/dev/null 2>&1; then
  warn "psql not found. Installing PostgreSQL client (requires sudo)..."
  sudo dnf install -y postgresql || sudo dnf install -y postgresql15 || err "Install PostgreSQL client manually and re-run" && exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  warn "curl not found. Installing curl (requires sudo)..."
  sudo dnf install -y curl || err "Install curl manually and re-run" && exit 1
fi

# Start Cloud SQL Proxy if requested
PROXY_PID=""
if [ "$CONNECTION_METHOD" = "proxy" ]; then
  if [ -z "$CLOUDSQL_INSTANCE" ]; then
    err "CLOUDSQL_INSTANCE is required for proxy mode (format: project:region:instance)"
    exit 1
  fi
  if [ -z "$SA_KEY_FILE" ]; then
    err "SA_KEY_FILE is required for proxy mode (path to service account JSON)"
    exit 1
  fi
  if [ ! -f ./cloud-sql-proxy ]; then
    log "Downloading Cloud SQL Auth Proxy..."
    curl -Lo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
    chmod +x cloud-sql-proxy
  fi
  log "Starting Cloud SQL Auth Proxy on 127.0.0.1:$LOCAL_PORT"
  ./cloud-sql-proxy "$CLOUDSQL_INSTANCE" \
    --port "$LOCAL_PORT" \
    --credentials-file "$SA_KEY_FILE" \
    --quiet &
  PROXY_PID=$!
  trap 'if [ -n "$PROXY_PID" ]; then log "Stopping Cloud SQL Proxy"; kill "$PROXY_PID" || true; fi' EXIT
  DB_HOST=127.0.0.1
  DB_PORT=$LOCAL_PORT
fi

# Compose DATABASE_URL for Prisma
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}"
if [ -n "$SSL_MODE" ]; then
  DATABASE_URL="$DATABASE_URL&sslmode=$SSL_MODE"
fi
export DATABASE_URL

log "Waiting for database to be ready at $DB_HOST:$DB_PORT..."
for i in $(seq 1 30); do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Optionally create the database using admin credentials
if [ "${CREATE_DB_IF_MISSING:-false}" = "true" ]; then
  ADMIN_USER=${DB_ADMIN_USER:-postgres}
  ADMIN_PASSWORD=${DB_ADMIN_PASSWORD:-}
  if [ -n "$ADMIN_PASSWORD" ]; then export PGPASSWORD="$ADMIN_PASSWORD"; fi
  log "Ensuring database '$DB_NAME' exists (admin user: $ADMIN_USER)"
  if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$ADMIN_USER" -c "CREATE DATABASE $DB_NAME"
  else
    log "Database '$DB_NAME' already exists"
  fi
fi

# Apply Prisma migrations
log "Applying Prisma migrations in '$BACKEND_DIR'"
cd "$BACKEND_DIR"
if [ ! -d node_modules ]; then
  log "Installing backend dependencies..."
  npm install
fi
log "Generating Prisma client..."
npx prisma generate
log "Deploying migrations..."
npx prisma migrate deploy

log "✅ Database ready: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
log "You can start the backend with: cd $BACKEND_DIR && npm run dev"