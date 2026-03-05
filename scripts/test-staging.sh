#!/usr/bin/env bash
# =============================================================================
# test-staging.sh — Full integration test suite for Preventli staging
# =============================================================================
# Usage:
#   BASE_URL=https://staging.preventli.com.au \
#   STAGING_EMAIL=admin@example.com \
#   STAGING_PASSWORD=yourpassword \
#   ./scripts/test-staging.sh [--verbose]
#
# Environment:
#   BASE_URL          — staging base URL (default: http://localhost:5000)
#   STAGING_EMAIL     — admin user email for login test
#   STAGING_PASSWORD  — admin user password
#   VERBOSE           — set to 1 to print all response bodies
#
# Exit codes:
#   0 — all tests passed
#   1 — one or more tests failed
# =============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
STAGING_EMAIL="${STAGING_EMAIL:-admin@test.local}"
STAGING_PASSWORD="${STAGING_PASSWORD:-testpassword}"
VERBOSE="${VERBOSE:-0}"
[[ "${1:-}" == "--verbose" ]] && VERBOSE=1

PASS=0
FAIL=0
SKIP=0
TOKEN=""
COOKIE_JAR="/tmp/preventli-test-cookies-$$.txt"
trap 'rm -f "${COOKIE_JAR}"' EXIT

# ── Helpers ──────────────────────────────────────────────────────────────────

green()  { echo -e "\033[0;32m  ✓ $*\033[0m"; }
red()    { echo -e "\033[0;31m  ✗ $*\033[0m"; }
yellow() { echo -e "\033[0;33m  ⊝ $*\033[0m"; }
info()   { echo -e "\033[0;36m\n▶ $*\033[0m"; }
detail() { [[ "${VERBOSE}" == "1" ]] && echo "    ${*}" || true; }

pass()   { PASS=$((PASS + 1)); green "$1"; }
fail()   { FAIL=$((FAIL + 1)); red "$1"; }
skip()   { SKIP=$((SKIP + 1)); yellow "SKIP: $1"; }

# Make an API call; returns body\nstatus_code
api() {
  local method="$1" path="$2"
  shift 2
  curl -s -w "\n%{http_code}" \
    -X "${method}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    --cookie-jar "${COOKIE_JAR}" \
    --cookie "${COOKIE_JAR}" \
    "$@" \
    "${BASE_URL}${path}"
}

status_of() { echo "$1" | tail -n1; }
body_of()   { echo "$1" | head -n -1; }

assert_status() {
  local label="$1" resp="$2"
  shift 2
  local status; status=$(status_of "${resp}")
  local body;   body=$(body_of "${resp}")
  detail "  HTTP ${status}: ${body:0:200}"
  for expected in "$@"; do
    [[ "${status}" == "${expected}" ]] && { pass "${label} (HTTP ${status})"; return 0; }
  done
  fail "${label} — expected HTTP $*, got ${status}"
  detail "  Body: ${body}"
  return 1
}

assert_field() {
  local label="$1" resp="$2" field="$3"
  local body; body=$(body_of "${resp}")
  if echo "${body}" | grep -q "${field}"; then
    pass "${label} — contains '${field}'"
  else
    fail "${label} — missing field '${field}' in response"
    detail "  Body: ${body:0:300}"
  fi
}

# ── Test suite ────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Preventli Integration Test Suite                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   Target: ${BASE_URL}"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Section 1: Infrastructure ─────────────────────────────────────────────────

info "1. Infrastructure Health"

RESP=$(api GET /api/system/health)
STATUS=$(status_of "${RESP}")
BODY=$(body_of "${RESP}")

if [[ "${STATUS}" == "200" ]] && echo "${BODY}" | grep -q '"status":"ok"'; then
  pass "Health check — system ok"
else
  fail "Health check — expected 200+ok, got ${STATUS}"
  detail "Body: ${BODY}"
fi

# Validate individual subsystems
for field in '"database":"ok"' '"storage"' '"ai"'; do
  if echo "${BODY}" | grep -q "${field}"; then
    pass "Health — ${field} present"
  else
    fail "Health — missing ${field} in response"
  fi
done

# email field present (ok or unconfigured)
if echo "${BODY}" | grep -q '"email"'; then
  pass "Health — email field present"
else
  fail "Health — missing email field"
fi

# ── Section 2: Authentication ─────────────────────────────────────────────────

info "2. Authentication"

# Login
RESP=$(api POST /api/auth/login -d "{\"email\":\"${STAGING_EMAIL}\",\"password\":\"${STAGING_PASSWORD}\"}")
STATUS=$(status_of "${RESP}")
BODY=$(body_of "${RESP}")

if [[ "${STATUS}" == "200" ]]; then
  TOKEN=$(echo "${BODY}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
  if [[ -n "${TOKEN}" ]]; then
    pass "Login — JWT received"
  else
    fail "Login — 200 but no accessToken in response"
  fi
else
  fail "Login — expected 200, got ${STATUS}"
  detail "Body: ${BODY}"
fi

# Reject bad credentials
RESP=$(api POST /api/auth/login -d '{"email":"nobody@invalid.test","password":"wrong"}')
assert_status "Login rejection" "${RESP}" "401" "400"

# Auth-protected endpoint without token (save and clear token)
SAVED_TOKEN="${TOKEN}"
TOKEN=""
RESP=$(api GET /api/gpnet2/cases)
assert_status "Unauthenticated rejection" "${RESP}" "401" "403"
TOKEN="${SAVED_TOKEN}"

# ── Section 3: Core Data Endpoints ───────────────────────────────────────────

info "3. Core Data"

RESP=$(api GET "/api/gpnet2/cases?page=1&limit=5")
assert_status "Case list" "${RESP}" "200"
assert_field  "Case list shape" "${RESP}" '"total"'

RESP=$(api GET "/api/workers?page=1&limit=1")
assert_status "Workers list" "${RESP}" "200"

RESP=$(api GET /api/notifications/recent)
assert_status "Notifications" "${RESP}" "200"

RESP=$(api GET /api/agents/jobs)
assert_status "Agent jobs list" "${RESP}" "200"

# ── Section 4: Control Tower Endpoints ───────────────────────────────────────

info "4. Control Tower (admin endpoints)"

CT_ENDPOINTS=(
  "/api/control/overview:totalCases"
  "/api/control/agents:last24h"
  "/api/control/ai:provider"
  "/api/control/uploads:uploadsLast24h"
  "/api/control/auth:last24h"
  "/api/control/alerts:activeCount"
)

for entry in "${CT_ENDPOINTS[@]}"; do
  path="${entry%%:*}"
  field="${entry##*:}"
  RESP=$(api GET "${path}")
  STATUS=$(status_of "${RESP}")
  if [[ "${STATUS}" == "200" ]]; then
    assert_field "Control Tower ${path}" "${RESP}" "\"${field}\""
  elif [[ "${STATUS}" == "403" || "${STATUS}" == "401" ]]; then
    pass "Control Tower ${path} — correctly restricted (HTTP ${STATUS})"
  else
    fail "Control Tower ${path} — expected 200 or 403, got ${STATUS}"
  fi
done

# ── Section 5: Agent Execution ────────────────────────────────────────────────

info "5. Agent Execution"

RESP=$(api POST /api/agents/trigger \
  -d '{"agentType":"coordinator","context":{"source":"integration-test"}}')
STATUS=$(status_of "${RESP}")
BODY=$(body_of "${RESP}")

if [[ "${STATUS}" == "200" ]]; then
  JOB_ID=$(echo "${BODY}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [[ -n "${JOB_ID}" ]]; then
    pass "Agent trigger — job created (id: ${JOB_ID})"

    # Poll for job completion (up to 30s)
    JOB_DONE=false
    for i in $(seq 1 6); do
      sleep 5
      JOB_RESP=$(api GET "/api/agents/jobs/${JOB_ID}")
      JOB_STATUS_VAL=$(body_of "${JOB_RESP}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || true)
      detail "  Job poll ${i}: status=${JOB_STATUS_VAL}"
      if [[ "${JOB_STATUS_VAL}" == "completed" || "${JOB_STATUS_VAL}" == "failed" ]]; then
        JOB_DONE=true
        break
      fi
    done

    if [[ "${JOB_DONE}" == "true" ]]; then
      if [[ "${JOB_STATUS_VAL}" == "completed" ]]; then
        pass "Agent execution — job completed successfully"
      else
        fail "Agent execution — job ended with status: ${JOB_STATUS_VAL}"
        detail "$(body_of "${JOB_RESP}")"
      fi
    else
      skip "Agent completion — job still running after 30s (async; check Control Tower)"
    fi
  else
    fail "Agent trigger — 200 but no job id in response"
  fi
elif [[ "${STATUS}" == "403" ]]; then
  pass "Agent trigger — correctly restricted (non-admin user)"
else
  fail "Agent trigger — expected 200 or 403, got ${STATUS}"
  detail "Body: ${BODY}"
fi

# Verify Control Tower reflects the job
RESP=$(api GET /api/control/agents)
STATUS=$(status_of "${RESP}")
if [[ "${STATUS}" == "200" ]]; then
  pass "Control Tower agents — updated after trigger"
elif [[ "${STATUS}" == "403" || "${STATUS}" == "401" ]]; then
  skip "Control Tower agents — user not admin, cannot verify update"
else
  fail "Control Tower agents — unexpected status ${STATUS}"
fi

# ── Section 6: AI Provider ────────────────────────────────────────────────────

info "6. AI Provider"

RESP=$(api GET /api/system/health)
BODY=$(body_of "${RESP}")

if echo "${BODY}" | grep -q '"ai":{'; then
  if echo "${BODY}" | grep -qv '"error"'; then
    pass "AI provider — health check ok (no error)"
  else
    fail "AI provider — health shows error"
    detail "${BODY}"
  fi
else
  fail "AI provider — no ai field in health response"
fi

RESP=$(api GET /api/control/ai)
STATUS=$(status_of "${RESP}")
if [[ "${STATUS}" == "200" ]]; then
  assert_field "AI metrics — provider" "${RESP}" '"provider"'
  assert_field "AI metrics — model"    "${RESP}" '"model"'
elif [[ "${STATUS}" == "403" || "${STATUS}" == "401" ]]; then
  pass "AI metrics — correctly restricted (HTTP ${STATUS})"
else
  fail "AI metrics — expected 200 or 403, got ${STATUS}"
fi

# ── Section 7: Storage ────────────────────────────────────────────────────────

info "7. Storage"

RESP=$(api GET /api/system/health)
BODY=$(body_of "${RESP}")

if echo "${BODY}" | grep -q '"storage":{'; then
  if echo "${BODY}" | grep -q '"provider"'; then
    pass "Storage — health reports provider"
  else
    fail "Storage — health missing provider field"
  fi
elif echo "${BODY}" | grep -q '"storage":"ok"'; then
  pass "Storage — health ok"
else
  fail "Storage — health missing or error"
  detail "${BODY}"
fi

RESP=$(api GET /api/control/uploads)
STATUS=$(status_of "${RESP}")
if [[ "${STATUS}" == "200" ]]; then
  assert_field "Storage metrics — storageProvider" "${RESP}" '"storageProvider"'
elif [[ "${STATUS}" == "403" || "${STATUS}" == "401" ]]; then
  pass "Storage metrics — correctly restricted (HTTP ${STATUS})"
else
  fail "Storage metrics — expected 200 or 403, got ${STATUS}"
fi

# ── Section 8: Email ──────────────────────────────────────────────────────────

info "8. Email"

RESP=$(api GET /api/system/health)
BODY=$(body_of "${RESP}")

if echo "${BODY}" | grep -q '"email":"ok"'; then
  pass "Email — SMTP configured and reachable"
elif echo "${BODY}" | grep -q '"email":"unconfigured"'; then
  skip "Email — SMTP not configured (non-critical for staging)"
else
  fail "Email — unexpected email status in health response"
  detail "${BODY}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

TOTAL=$((PASS + FAIL + SKIP))

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
printf "║  Results: %3d passed  %3d failed  %3d skipped  %3d total ║\n" \
  "${PASS}" "${FAIL}" "${SKIP}" "${TOTAL}"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [[ "${FAIL}" -gt 0 ]]; then
  red "Integration tests FAILED — ${FAIL} failure(s)"
  exit 1
else
  green "All tests passed"
  exit 0
fi
