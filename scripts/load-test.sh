#!/usr/bin/env bash
# =============================================================================
# load-test.sh — Moderate load simulation for Preventli staging
# =============================================================================
# Simulates realistic multi-user activity to verify system stability.
# Does NOT require artillery/k6 — uses only curl and bash.
#
# Usage:
#   BASE_URL=https://staging.preventli.com.au \
#   STAGING_EMAIL=admin@example.com \
#   STAGING_PASSWORD=yourpassword \
#   ./scripts/load-test.sh [--concurrency 5] [--duration 60]
#
# Options:
#   --concurrency N   Parallel workers (default: 5)
#   --duration N      Test duration in seconds (default: 60)
#   --quick           Short 15s run for smoke testing
#
# Exit codes:
#   0 — load test completed, error rate within acceptable threshold
#   1 — error rate exceeded threshold or critical failure
# =============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
STAGING_EMAIL="${STAGING_EMAIL:-admin@test.local}"
STAGING_PASSWORD="${STAGING_PASSWORD:-testpassword}"
CONCURRENCY=5
DURATION=60
RESULTS_DIR="/tmp/preventli-load-$$"
ERROR_RATE_THRESHOLD=5  # % — fail if error rate exceeds this

for arg in "$@"; do
  case $arg in
    --concurrency=*) CONCURRENCY="${arg#*=}" ;;
    --duration=*)    DURATION="${arg#*=}"    ;;
    --quick)         DURATION=15; CONCURRENCY=3 ;;
  esac
done

mkdir -p "${RESULTS_DIR}"
trap 'rm -rf "${RESULTS_DIR}"' EXIT

# ── Colours ───────────────────────────────────────────────────────────────────

info()  { echo -e "\033[0;36m[load]\033[0m $*"; }
ok()    { echo -e "\033[0;32m[load] ✓ $*\033[0m"; }
warn()  { echo -e "\033[0;33m[load] ⚠ $*\033[0m"; }
fail()  { echo -e "\033[0;31m[load] ✗ $*\033[0m" >&2; }

# ── Pre-flight ────────────────────────────────────────────────────────────────

info "Pre-flight: authenticate..."
AUTH_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${STAGING_EMAIL}\",\"password\":\"${STAGING_PASSWORD}\"}" \
  --cookie-jar "${RESULTS_DIR}/cookies.txt")

AUTH_STATUS=$(echo "${AUTH_RESP}" | tail -n1)
AUTH_BODY=$(echo "${AUTH_RESP}" | head -n -1)

if [[ "${AUTH_STATUS}" != "200" ]]; then
  fail "Authentication failed (HTTP ${AUTH_STATUS}) — cannot run load test"
  exit 1
fi

TOKEN=$(echo "${AUTH_BODY}" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
if [[ -z "${TOKEN}" ]]; then
  fail "No access token in login response — cannot run load test"
  exit 1
fi
ok "Authenticated (token received)"

# ── Worker function ───────────────────────────────────────────────────────────

WORKER_RESULTS="${RESULTS_DIR}/worker"

run_worker() {
  local worker_id="$1"
  local end_time=$(( $(date +%s) + DURATION ))
  local req_count=0
  local err_count=0
  local result_file="${WORKER_RESULTS}_${worker_id}.txt"
  local cookie_jar="${RESULTS_DIR}/cookies_${worker_id}.txt"
  cp "${RESULTS_DIR}/cookies.txt" "${cookie_jar}"

  # Define workload: (method path [body])
  declare -a REQUESTS=(
    "GET /api/system/health"
    "GET /api/cases?page=1&limit=10"
    "GET /api/workers?page=1&limit=5"
    "GET /api/notifications/recent"
    "GET /api/agents/jobs"
    "GET /api/control/overview"
    "GET /api/control/agents"
    "GET /api/control/ai"
    "GET /api/control/uploads"
    "GET /api/control/alerts"
  )

  while [[ $(date +%s) -lt ${end_time} ]]; do
    # Pick a random request from the workload
    local req="${REQUESTS[$((RANDOM % ${#REQUESTS[@]}))]}"
    local method="${req%% *}"
    local path="${req#* }"

    local t_start; t_start=$(date +%s%3N)
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "${method}" \
      -H "Authorization: Bearer ${TOKEN}" \
      --cookie-jar "${cookie_jar}" \
      --cookie "${cookie_jar}" \
      --max-time 10 \
      "${BASE_URL}${path}" 2>/dev/null)
    local t_end; t_end=$(date +%s%3N)
    local latency=$(( t_end - t_start ))

    req_count=$(( req_count + 1 ))

    # Count errors: 5xx or curl failure
    if [[ "${status}" =~ ^5 ]] || [[ "${status}" == "000" ]]; then
      err_count=$(( err_count + 1 ))
      echo "ERR ${status} ${latency}ms ${path}" >> "${result_file}"
    else
      echo "OK  ${status} ${latency}ms ${path}" >> "${result_file}"
    fi

    # Small random sleep to avoid pure burst (50-200ms)
    sleep "0.$(( (RANDOM % 15) + 5 ))"
  done

  echo "SUMMARY worker=${worker_id} requests=${req_count} errors=${err_count}" >> "${result_file}"
}

# ── Run workers ───────────────────────────────────────────────────────────────

echo ""
info "Starting load test"
info "  Target:      ${BASE_URL}"
info "  Concurrency: ${CONCURRENCY} workers"
info "  Duration:    ${DURATION}s"
echo ""

START_TIME=$(date +%s)
PIDS=()

for i in $(seq 1 "${CONCURRENCY}"); do
  run_worker "${i}" &
  PIDS+=($!)
done

# Progress bar
elapsed=0
while [[ ${elapsed} -lt ${DURATION} ]]; do
  sleep 5
  elapsed=$(( $(date +%s) - START_TIME ))
  pct=$(( elapsed * 100 / DURATION ))
  pct=$(( pct > 100 ? 100 : pct ))
  filled=$(( pct / 5 ))
  bar=$(printf '%0.s█' $(seq 1 ${filled}))$(printf '%0.s░' $(seq 1 $(( 20 - filled ))))
  printf "\r  Progress: [%s] %d%% (%ds/%ds)" "${bar}" "${pct}" "${elapsed}" "${DURATION}"
done

# Wait for all workers
for pid in "${PIDS[@]}"; do wait "${pid}" 2>/dev/null || true; done
echo ""

# ── Collect results ───────────────────────────────────────────────────────────

TOTAL_REQ=0
TOTAL_ERR=0
TOTAL_LATENCY=0
LAT_COUNT=0

for result_file in "${WORKER_RESULTS}"_*.txt; do
  [[ -f "${result_file}" ]] || continue

  while IFS= read -r line; do
    if [[ "${line}" =~ ^SUMMARY ]]; then
      reqs=$(echo "${line}" | grep -o 'requests=[0-9]*' | cut -d= -f2)
      errs=$(echo "${line}" | grep -o 'errors=[0-9]*' | cut -d= -f2)
      TOTAL_REQ=$(( TOTAL_REQ + reqs ))
      TOTAL_ERR=$(( TOTAL_ERR + errs ))
    elif [[ "${line}" =~ ^(OK|ERR) ]]; then
      lat=$(echo "${line}" | grep -oE '[0-9]+ms' | grep -oE '[0-9]+')
      TOTAL_LATENCY=$(( TOTAL_LATENCY + lat ))
      LAT_COUNT=$(( LAT_COUNT + 1 ))
    fi
  done < "${result_file}"
done

ACTUAL_DURATION=$(( $(date +%s) - START_TIME ))
RPS=0
[[ ${ACTUAL_DURATION} -gt 0 ]] && RPS=$(( TOTAL_REQ / ACTUAL_DURATION ))
AVG_LATENCY=0
[[ ${LAT_COUNT} -gt 0 ]] && AVG_LATENCY=$(( TOTAL_LATENCY / LAT_COUNT ))
ERROR_RATE=0
[[ ${TOTAL_REQ} -gt 0 ]] && ERROR_RATE=$(( TOTAL_ERR * 100 / TOTAL_REQ ))

# ── Report ────────────────────────────────────────────────────────────────────

echo ""
echo "======================================================================="
info "Load Test Results"
echo "  Duration:       ${ACTUAL_DURATION}s"
echo "  Total requests: ${TOTAL_REQ}"
echo "  Errors (5xx):   ${TOTAL_ERR}"
echo "  Error rate:     ${ERROR_RATE}%  (threshold: ${ERROR_RATE_THRESHOLD}%)"
echo "  Avg latency:    ${AVG_LATENCY}ms"
echo "  Throughput:     ~${RPS} req/s"
echo "======================================================================="

# Print any error lines
ERROR_LINES=$(cat "${WORKER_RESULTS}"_*.txt 2>/dev/null | grep "^ERR" | head -20)
if [[ -n "${ERROR_LINES}" ]]; then
  warn "Error sample:"
  echo "${ERROR_LINES}" | while IFS= read -r line; do echo "  ${line}"; done
fi

if [[ ${ERROR_RATE} -gt ${ERROR_RATE_THRESHOLD} ]]; then
  fail "Error rate ${ERROR_RATE}% exceeds threshold ${ERROR_RATE_THRESHOLD}%"
  exit 1
else
  ok "Load test passed — error rate ${ERROR_RATE}% within acceptable threshold"
  exit 0
fi
