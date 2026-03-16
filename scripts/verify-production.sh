#!/usr/bin/env bash
set -euo pipefail

# Preventli Production Verification Script
# Tests all infrastructure components to ensure they're working

echo "🔍 Preventli Production Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Get backend URL from environment or prompt
BACKEND_URL="${BACKEND_URL:-}"

if [ -z "$BACKEND_URL" ]; then
    echo -e "${BLUE}Enter your Railway backend URL (e.g., https://preventli-api.up.railway.app):${NC}"
    read -r BACKEND_URL
fi

# Normalize URL (add https:// if missing, remove trailing slash)
if [[ ! "$BACKEND_URL" =~ ^https?:// ]]; then
    BACKEND_URL="https://$BACKEND_URL"
fi
BACKEND_URL="${BACKEND_URL%/}"

echo "Testing backend: $BACKEND_URL"
echo ""

# ===========================
# 1. Health Endpoint
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HEALTH_URL="$BACKEND_URL/health"
echo "Testing: $HEALTH_URL"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" || echo "000")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} Health endpoint responding (HTTP 200)"
    echo "Response: $HEALTH_BODY"
else
    echo -e "${RED}❌ Health endpoint failed (HTTP $HEALTH_CODE)${NC}"
    echo "Response: $HEALTH_BODY"
    ((ERRORS++))
fi

echo ""

# ===========================
# 2. Database Connection
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  2. Database Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${YELLOW}⚠ DATABASE_URL not set, skipping database test${NC}"
    ((WARNINGS++))
else
    echo "Testing database connection..."
    
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        node <<'EOF'
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function testDb() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`✅ Database connected (${result.rows[0].count} tables)`);
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

testDb();
EOF
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Database connection successful"
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠ Node.js not available, skipping database test${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# ===========================
# 3. AI Provider
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3. AI Provider"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LLM_PROVIDER="${LLM_PROVIDER:-openrouter}"
echo "Configured provider: $LLM_PROVIDER"

case "$LLM_PROVIDER" in
    openrouter)
        if [ -n "${OPENROUTER_API_KEY:-}" ]; then
            echo "Testing OpenRouter API key..."
            
            OR_RESPONSE=$(curl -s -w "\n%{http_code}" https://openrouter.ai/api/v1/auth/key \
                -H "Authorization: Bearer $OPENROUTER_API_KEY" || echo "000")
            OR_CODE=$(echo "$OR_RESPONSE" | tail -n 1)
            
            if [ "$OR_CODE" == "200" ]; then
                echo -e "${GREEN}✓${NC} OpenRouter API key valid"
            else
                echo -e "${RED}❌ OpenRouter API key invalid (HTTP $OR_CODE)${NC}"
                ((ERRORS++))
            fi
        else
            echo -e "${YELLOW}⚠ OPENROUTER_API_KEY not set${NC}"
            ((WARNINGS++))
        fi
        ;;
    anthropic)
        if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
            echo -e "${GREEN}✓${NC} ANTHROPIC_API_KEY is set"
            echo -e "${YELLOW}⚠ Cannot test Anthropic API key without making a paid request${NC}"
        else
            echo -e "${YELLOW}⚠ ANTHROPIC_API_KEY not set${NC}"
            ((WARNINGS++))
        fi
        ;;
    openai)
        if [ -n "${OPENAI_API_KEY:-}" ]; then
            echo -e "${GREEN}✓${NC} OPENAI_API_KEY is set"
            echo -e "${YELLOW}⚠ Cannot test OpenAI API key without making a paid request${NC}"
        else
            echo -e "${YELLOW}⚠ OPENAI_API_KEY not set${NC}"
            ((WARNINGS++))
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠ Unknown LLM provider: $LLM_PROVIDER${NC}"
        ((WARNINGS++))
        ;;
esac

echo ""

# ===========================
# 4. Storage Provider
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  4. Storage Provider"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}"
echo "Configured provider: $STORAGE_PROVIDER"

if [ "$STORAGE_PROVIDER" == "s3" ]; then
    if [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ACCESS_KEY:-}" ] && [ -n "${S3_SECRET_KEY:-}" ]; then
        echo -e "${GREEN}✓${NC} S3 credentials configured"
        echo -e "${YELLOW}⚠ Cannot test S3 access without AWS CLI or additional tooling${NC}"
        echo "   Bucket: ${S3_BUCKET}"
        echo "   Endpoint: ${S3_ENDPOINT:-default}"
    else
        echo -e "${RED}❌ S3 credentials incomplete${NC}"
        echo "   Missing: $([ -z "${S3_BUCKET:-}" ] && echo "S3_BUCKET ") $([ -z "${S3_ACCESS_KEY:-}" ] && echo "S3_ACCESS_KEY ") $([ -z "${S3_SECRET_KEY:-}" ] && echo "S3_SECRET_KEY")"
        ((ERRORS++))
    fi
elif [ "$STORAGE_PROVIDER" == "local" ]; then
    echo -e "${GREEN}✓${NC} Using local storage (uploads directory)"
else
    echo -e "${YELLOW}⚠ Unknown storage provider: $STORAGE_PROVIDER${NC}"
    ((WARNINGS++))
fi

echo ""

# ===========================
# 5. Email Provider
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  5. Email Provider"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

EMAIL_PROVIDER="${EMAIL_PROVIDER:-resend}"
echo "Configured provider: $EMAIL_PROVIDER"

case "$EMAIL_PROVIDER" in
    resend)
        if [ -n "${RESEND_API_KEY:-}" ]; then
            echo -e "${GREEN}✓${NC} RESEND_API_KEY is set"
            echo -e "${YELLOW}⚠ Cannot test Resend without sending an email${NC}"
        else
            echo -e "${YELLOW}⚠ RESEND_API_KEY not set${NC}"
            ((WARNINGS++))
        fi
        ;;
    smtp)
        if [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_PORT:-}" ]; then
            echo -e "${GREEN}✓${NC} SMTP credentials configured"
            echo "   Host: ${SMTP_HOST}:${SMTP_PORT}"
        else
            echo -e "${RED}❌ SMTP credentials incomplete${NC}"
            ((ERRORS++))
        fi
        ;;
    sendgrid)
        if [ -n "${SENDGRID_API_KEY:-}" ]; then
            echo -e "${GREEN}✓${NC} SENDGRID_API_KEY is set"
        else
            echo -e "${YELLOW}⚠ SENDGRID_API_KEY not set${NC}"
            ((WARNINGS++))
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠ Unknown email provider: $EMAIL_PROVIDER${NC}"
        ((WARNINGS++))
        ;;
esac

if [ -n "${EMAIL_FROM:-}" ]; then
    echo -e "${GREEN}✓${NC} EMAIL_FROM: ${EMAIL_FROM}"
else
    echo -e "${YELLOW}⚠ EMAIL_FROM not set${NC}"
    ((WARNINGS++))
fi

echo ""

# ===========================
# 6. API Endpoints
# ===========================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  6. Core API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test CSRF token endpoint
echo "Testing: $BACKEND_URL/api/csrf-token"
CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/csrf-token" || echo "000")
CSRF_CODE=$(echo "$CSRF_RESPONSE" | tail -n 1)

if [ "$CSRF_CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} CSRF endpoint responding"
else
    echo -e "${RED}❌ CSRF endpoint failed (HTTP $CSRF_CODE)${NC}"
    ((ERRORS++))
fi

echo ""

# ===========================
# Summary
# ===========================
echo "======================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo ""
    echo "Production infrastructure is ready."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "System is functional but some components are not fully configured."
    echo "Review warnings above and configure missing services as needed."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Production infrastructure has critical issues."
    echo "Fix errors above before launching to users."
    echo ""
    echo "See docs/infrastructure-setup.md for troubleshooting."
    exit 1
fi
