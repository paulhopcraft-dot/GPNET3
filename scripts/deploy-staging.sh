#!/usr/bin/env bash
# =============================================================================
# deploy-staging.sh — Validate, build, start, migrate, and test staging stack
# =============================================================================
# Usage:
#   ./scripts/deploy-staging.sh [--skip-build] [--skip-migrate] [--skip-tests]
#
# Requirements:
#   - Docker + Docker Compose installed
#   - .env.staging file with all required variables filled in
#   - docker-compose.production.yml present at repo root
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/scripts"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.production.yml"
ENV_FILE="${REPO_ROOT}/.env.staging"
APP_SERVICE="app"
MAX_HEALTH_RETRIES=24
HEALTH_RETRY_WAIT=5

SKIP_BUILD=false
SKIP_MIGRATE=false
SKIP_TESTS=false

for arg in "$@"; do
  case $arg in
    --skip-build)   SKIP_BUILD=true   ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    --skip-tests)   SKIP_TESTS=true   ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────

log()  { echo "[deploy] $*"; }
info() { echo -e "\033[0;36m[deploy]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[deploy] ✓ $*\033[0m"; }
fail() { echo -e "\033[0;31m[deploy] ✗ $*\033[0m" >&2; exit 1; }

# ── Phase 0: Pre-flight ───────────────────────────────────────────────────────

info "Pre-flight checks..."

command -v docker  >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not installed"
command -v curl    >/dev/null 2>&1 || fail "curl is not installed"

[[ -f "${COMPOSE_FILE}" ]] || fail "docker-compose.production.yml not found at ${REPO_ROOT}"
[[ -f "${ENV_FILE}" ]] || fail ".env.staging not found at ${REPO_ROOT} — copy .env.staging.example and fill in secrets"

ok "Pre-flight checks passed"

# ── Phase 1: Environment validation ──────────────────────────────────────────

info "Validating environment variables..."
"${SCRIPTS_DIR}/validate-env.sh" --env-file "${ENV_FILE}" || fail "Environment validation failed — fix errors above"
ok "Environment validation passed"

# ── Phase 2: Build ────────────────────────────────────────────────────────────

if [[ "${SKIP_BUILD}" == "false" ]]; then
  info "Building Docker image..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build "${APP_SERVICE}"
  ok "Image built"
else
  log "Skipping build (--skip-build)"
fi

# ── Phase 3: Start stack ──────────────────────────────────────────────────────

info "Starting stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
ok "Stack started"

# ── Phase 4: Wait for health ──────────────────────────────────────────────────

# Load APP_URL from env file for health check URL
APP_URL_VAL=$(grep -E "^APP_URL=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' || true)
HEALTH_URL="${APP_URL_VAL:-http://localhost:5000}/api/system/health"

info "Waiting for app to become healthy at ${HEALTH_URL}..."
attempt=0
until curl -sf "${HEALTH_URL}" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [[ ${attempt} -ge ${MAX_HEALTH_RETRIES} ]]; then
    echo ""
    log "--- App logs (last 40 lines) ---"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs "${APP_SERVICE}" | tail -40
    fail "App did not become healthy after $((MAX_HEALTH_RETRIES * HEALTH_RETRY_WAIT))s"
  fi
  log "  Not ready (attempt ${attempt}/${MAX_HEALTH_RETRIES})... retrying in ${HEALTH_RETRY_WAIT}s"
  sleep "${HEALTH_RETRY_WAIT}"
done
ok "App is accepting requests"

# ── Phase 5: Database migrations ──────────────────────────────────────────────

if [[ "${SKIP_MIGRATE}" == "false" ]]; then
  info "Running database migrations..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    exec -T "${APP_SERVICE}" npm run db:push
  ok "Migrations applied"
else
  log "Skipping migrations (--skip-migrate)"
fi

# ── Phase 6: Final health check ───────────────────────────────────────────────

info "Final health check..."
HEALTH_RESPONSE=$(curl -sf "${HEALTH_URL}") || fail "Health endpoint unreachable: ${HEALTH_URL}"
if echo "${HEALTH_RESPONSE}" | grep -q '"status":"ok"'; then
  ok "Health check passed — all subsystems ok"
else
  log "Health response: ${HEALTH_RESPONSE}"
  fail "System reports degraded status — check subsystem errors above"
fi

# ── Phase 7: Integration tests ────────────────────────────────────────────────

if [[ "${SKIP_TESTS}" == "false" ]]; then
  info "Running integration tests..."
  BASE_URL="${APP_URL_VAL:-http://localhost:5000}" \
  STAGING_EMAIL="${STAGING_EMAIL:-admin@test.local}" \
  STAGING_PASSWORD="${STAGING_PASSWORD:-testpassword}" \
  "${SCRIPTS_DIR}/test-staging.sh" || fail "Integration tests failed — deployment rolled back or needs review"
  ok "Integration tests passed"
else
  log "Skipping integration tests (--skip-tests)"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "======================================================================="
ok "Staging deployment complete"
echo "  URL:    ${APP_URL_VAL:-http://localhost:5000}"
echo "  Health: ${HEALTH_URL}"
echo ""
echo "  Next steps:"
echo "    - Open Control Tower: ${APP_URL_VAL:-http://localhost:5000}/admin/control-tower"
echo "    - Review Sentry dashboard for any errors"
echo "    - Run: ./scripts/validate-env.sh before promoting to production"
echo "======================================================================="
