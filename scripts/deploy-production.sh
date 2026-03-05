#!/usr/bin/env bash
# =============================================================================
# deploy-production.sh — Production deployment with safety checks
# =============================================================================
# Usage:
#   ./scripts/deploy-production.sh [--skip-build] [--skip-migrate]
#
# This script is intentionally conservative:
#   - Tags the current image for rollback before deploying
#   - Refuses to run without a passing validate-env.sh
#   - Pauses for confirmation before starting services
#
# Requirements:
#   - Docker + Docker Compose installed
#   - .env file present (copy from .env.production.example)
#   - docker-compose.production.yml present
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/scripts"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.production.yml"
ENV_FILE="${REPO_ROOT}/.env"
APP_SERVICE="app"
IMAGE_NAME="preventli"
ROLLBACK_TAG="backup-$(date +%Y%m%d-%H%M%S)"
MAX_HEALTH_RETRIES=30
HEALTH_RETRY_WAIT=5

SKIP_BUILD=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case $arg in
    --skip-build)   SKIP_BUILD=true   ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────

log()    { echo "[deploy:prod] $*"; }
info()   { echo -e "\033[0;36m[deploy:prod]\033[0m $*"; }
ok()     { echo -e "\033[0;32m[deploy:prod] ✓ $*\033[0m"; }
warn()   { echo -e "\033[0;33m[deploy:prod] ⚠ $*\033[0m"; }
fail()   { echo -e "\033[0;31m[deploy:prod] ✗ $*\033[0m" >&2; exit 1; }

confirm() {
  echo ""
  warn "$1"
  read -r -p "  Type 'yes' to continue: " REPLY
  [[ "${REPLY}" == "yes" ]] || { log "Deployment cancelled."; exit 0; }
}

# ── Phase 0: Pre-flight ───────────────────────────────────────────────────────

info "Pre-flight checks..."

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin not installed"
command -v curl   >/dev/null 2>&1 || fail "curl is not installed"

[[ -f "${COMPOSE_FILE}" ]] || fail "docker-compose.production.yml not found"
[[ -f "${ENV_FILE}" ]] || fail ".env not found — copy from .env.production.example and fill in all values"

ok "Pre-flight checks passed"

# ── Phase 1: Environment validation ──────────────────────────────────────────

info "Validating production environment..."
"${SCRIPTS_DIR}/validate-env.sh" --env-file "${ENV_FILE}" || fail "Environment validation failed"
ok "Environment validation passed"

# ── Confirm production deployment ─────────────────────────────────────────────

APP_URL_VAL=$(grep -E "^APP_URL=" "${ENV_FILE}" | cut -d'=' -f2- | tr -d '"' || true)
HEALTH_URL="${APP_URL_VAL:-http://localhost:5000}/api/system/health"

confirm "You are about to deploy to PRODUCTION (${APP_URL_VAL:-http://localhost:5000}). This will affect live users."

# ── Phase 2: Tag current image for rollback ───────────────────────────────────

info "Tagging current image for rollback..."
if docker image inspect "${IMAGE_NAME}:latest" >/dev/null 2>&1; then
  docker tag "${IMAGE_NAME}:latest" "${IMAGE_NAME}:${ROLLBACK_TAG}"
  ok "Rollback tag created: ${IMAGE_NAME}:${ROLLBACK_TAG}"
  log "  To rollback: docker tag ${IMAGE_NAME}:${ROLLBACK_TAG} ${IMAGE_NAME}:latest && docker compose up -d --no-deps app"
else
  warn "No existing image found — skipping rollback tag (first deploy?)"
fi

# ── Phase 3: Build ────────────────────────────────────────────────────────────

if [[ "${SKIP_BUILD}" == "false" ]]; then
  info "Building Docker image..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build "${APP_SERVICE}"
  ok "Image built"
else
  log "Skipping build (--skip-build)"
fi

# ── Phase 4: Start / update stack ────────────────────────────────────────────

info "Starting production stack (rolling update)..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --no-deps "${APP_SERVICE}"
ok "Stack updated"

# ── Phase 5: Wait for health ──────────────────────────────────────────────────

info "Waiting for app to become healthy at ${HEALTH_URL}..."
attempt=0
until curl -sf "${HEALTH_URL}" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [[ ${attempt} -ge ${MAX_HEALTH_RETRIES} ]]; then
    echo ""
    log "--- App logs (last 40 lines) ---"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs "${APP_SERVICE}" | tail -40
    warn "App failed to become healthy — rolling back to ${ROLLBACK_TAG}..."
    docker tag "${IMAGE_NAME}:${ROLLBACK_TAG}" "${IMAGE_NAME}:latest" 2>/dev/null || true
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --no-deps "${APP_SERVICE}" 2>/dev/null || true
    fail "Deployment failed — rolled back to ${ROLLBACK_TAG}"
  fi
  log "  Not ready (attempt ${attempt}/${MAX_HEALTH_RETRIES})... retrying in ${HEALTH_RETRY_WAIT}s"
  sleep "${HEALTH_RETRY_WAIT}"
done
ok "App is accepting requests"

# ── Phase 6: Migrations ───────────────────────────────────────────────────────

if [[ "${SKIP_MIGRATE}" == "false" ]]; then
  info "Running database migrations..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
    exec -T "${APP_SERVICE}" npm run db:push
  ok "Migrations applied"
else
  log "Skipping migrations (--skip-migrate)"
fi

# ── Phase 7: Final health check ───────────────────────────────────────────────

info "Final health check..."
HEALTH_RESPONSE=$(curl -sf "${HEALTH_URL}") || fail "Health endpoint unreachable after migration"
if echo "${HEALTH_RESPONSE}" | grep -q '"status":"ok"'; then
  ok "Health check passed — all subsystems ok"
else
  log "Health response: ${HEALTH_RESPONSE}"
  fail "System degraded after deployment — investigate immediately"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "======================================================================="
ok "Production deployment complete"
echo "  URL:          ${APP_URL_VAL:-http://localhost:5000}"
echo "  Health:       ${HEALTH_URL}"
echo "  Rollback tag: ${IMAGE_NAME}:${ROLLBACK_TAG}"
echo ""
echo "  Monitor:"
echo "    - Control Tower: ${APP_URL_VAL:-http://localhost:5000}/admin/control-tower"
echo "    - Sentry:        check for new errors in the next 10 minutes"
echo "    - Logs:          docker compose -f docker-compose.production.yml logs -f app"
echo "======================================================================="
