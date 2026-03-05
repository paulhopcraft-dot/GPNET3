#!/usr/bin/env bash
# =============================================================================
# validate-env.sh — Validate required environment variables before deployment
# =============================================================================
# Usage:
#   source .env && ./scripts/validate-env.sh
#   # or
#   ./scripts/validate-env.sh --env-file .env.staging
#
# Exit codes:
#   0 — all required variables are set
#   1 — one or more required variables are missing or invalid
# =============================================================================

set -uo pipefail

ENV_FILE=""

for arg in "$@"; do
  case $arg in
    --env-file=*) ENV_FILE="${arg#*=}" ;;
    --env-file)   shift; ENV_FILE="$1"  ;;
  esac
done

# Load env file if provided
if [[ -n "${ENV_FILE}" ]]; then
  [[ -f "${ENV_FILE}" ]] || { echo "ERROR: env file not found: ${ENV_FILE}"; exit 1; }
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

# ── Helpers ──────────────────────────────────────────────────────────────────

ERRORS=0

ok()     { echo -e "  \033[0;32m✓\033[0m $*"; }
missing(){ echo -e "  \033[0;31m✗ MISSING:\033[0m $*"; ERRORS=$((ERRORS + 1)); }
warn()   { echo -e "  \033[0;33m⚠\033[0m $*"; }
section(){ echo -e "\n\033[0;36m── $* ──\033[0m"; }

require() {
  local var="$1"
  local desc="${2:-}"
  local val="${!var:-}"
  if [[ -z "${val}" ]]; then
    missing "${var}${desc:+ — ${desc}}"
  else
    ok "${var}"
  fi
}

require_one_of() {
  local desc="$1"
  shift
  for var in "$@"; do
    local val="${!var:-}"
    if [[ -n "${val}" ]]; then
      ok "${var} (satisfies: ${desc})"
      return 0
    fi
  done
  missing "${desc} — set one of: $*"
}

min_length() {
  local var="$1"
  local min="$2"
  local val="${!var:-}"
  if [[ -z "${val}" ]]; then
    missing "${var} — not set"
  elif [[ ${#val} -lt ${min} ]]; then
    missing "${var} — must be at least ${min} characters (got ${#val})"
  else
    ok "${var} (length: ${#val})"
  fi
}

# ── Database ──────────────────────────────────────────────────────────────────

section "Database"
require DATABASE_URL "PostgreSQL connection string"

# Sanity check: URL starts with postgresql:// or postgres://
if [[ -n "${DATABASE_URL:-}" ]]; then
  if [[ "${DATABASE_URL}" =~ ^postgres(ql)?:// ]]; then
    ok "DATABASE_URL format valid"
  else
    missing "DATABASE_URL — must start with postgresql:// or postgres://"
  fi
fi

# ── Authentication ────────────────────────────────────────────────────────────

section "Authentication"
min_length JWT_SECRET 32
min_length SESSION_SECRET 32

# Warn if JWT and SESSION secrets are identical
if [[ -n "${JWT_SECRET:-}" && "${JWT_SECRET:-}" == "${SESSION_SECRET:-}" ]]; then
  warn "JWT_SECRET and SESSION_SECRET are identical — they must be different"
  ERRORS=$((ERRORS + 1))
fi

# ── AI Provider ───────────────────────────────────────────────────────────────

section "AI Provider"
require LLM_PROVIDER "openrouter or anthropic"

case "${LLM_PROVIDER:-}" in
  openrouter)
    require OPENROUTER_API_KEY "required when LLM_PROVIDER=openrouter"
    if [[ -n "${OPENROUTER_API_KEY:-}" && ! "${OPENROUTER_API_KEY}" =~ ^sk-or- ]]; then
      warn "OPENROUTER_API_KEY does not start with sk-or- — verify it is correct"
    fi
    ;;
  anthropic)
    require ANTHROPIC_API_KEY "required when LLM_PROVIDER=anthropic"
    ;;
  "")
    : # already caught by require above
    ;;
  *)
    missing "LLM_PROVIDER — unknown value '${LLM_PROVIDER}', expected: openrouter | anthropic"
    ;;
esac

# ── Storage ───────────────────────────────────────────────────────────────────

section "Storage"
require STORAGE_PROVIDER "local or s3"

case "${STORAGE_PROVIDER:-}" in
  s3)
    require AWS_S3_BUCKET   "S3/R2 bucket name"
    require AWS_S3_REGION   "S3/R2 region (e.g. ap-southeast-2 or auto for R2)"
    require AWS_ACCESS_KEY_ID     "AWS/R2 access key"
    require AWS_SECRET_ACCESS_KEY "AWS/R2 secret key"
    ;;
  local)
    warn "STORAGE_PROVIDER=local — file uploads will be stored on local disk; not suitable for production"
    ;;
  "")
    : # already caught
    ;;
  *)
    missing "STORAGE_PROVIDER — unknown value '${STORAGE_PROVIDER}', expected: local | s3"
    ;;
esac

# ── Email / SMTP ──────────────────────────────────────────────────────────────

section "Email (SMTP)"
if [[ -n "${SMTP_HOST:-}" ]]; then
  require SMTP_HOST "SMTP relay hostname"
  require SMTP_USER "SMTP username"
  require SMTP_PASS "SMTP password"
  require SMTP_FROM "Sender address"
  ok "SMTP configuration present"
else
  warn "SMTP not configured — email delivery will be logged to console only"
fi

# ── Server ────────────────────────────────────────────────────────────────────

section "Server"
require NODE_ENV  "development | staging | production"
require CLIENT_URL "Public frontend URL (for CORS)"
require APP_URL    "Public app URL (for email links)"

if [[ "${NODE_ENV:-}" == "production" ]]; then
  if [[ "${CLIENT_URL:-}" =~ ^http:// ]]; then
    warn "CLIENT_URL uses http:// — production should use https://"
  fi
  if [[ "${APP_URL:-}" =~ ^http:// ]]; then
    warn "APP_URL uses http:// — production should use https://"
  fi
fi

# ── Monitoring ────────────────────────────────────────────────────────────────

section "Monitoring"
if [[ -n "${SENTRY_DSN:-}" ]]; then
  ok "SENTRY_DSN configured"
else
  warn "SENTRY_DSN not set — error monitoring disabled (recommended for production)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "======================================================="
if [[ "${ERRORS}" -gt 0 ]]; then
  echo -e "\033[0;31m  VALIDATION FAILED — ${ERRORS} error(s) found\033[0m"
  echo "  Fix the errors above before deploying."
  echo "======================================================="
  exit 1
else
  echo -e "\033[0;32m  VALIDATION PASSED — environment looks good\033[0m"
  echo "======================================================="
  exit 0
fi
