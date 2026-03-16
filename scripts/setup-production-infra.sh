#!/usr/bin/env bash
set -euo pipefail

# Preventli Production Infrastructure Setup Guide
# Interactive script to walk through production deployment

echo "🚀 Preventli Production Infrastructure Setup"
echo "=============================================="
echo ""
echo "This script will guide you through deploying Preventli to:"
echo "  - Neon (PostgreSQL database)"
echo "  - Railway (Express backend)"
echo "  - Vercel (Vite frontend)"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to wait for user confirmation
wait_for_enter() {
    echo ""
    echo -e "${BLUE}Press ENTER when ready to continue...${NC}"
    read -r
}

# Helper function to capture user input
prompt_input() {
    local prompt_text=$1
    local var_name=$2
    
    echo ""
    echo -e "${BLUE}${prompt_text}${NC}"
    read -r "$var_name"
}

echo -e "${YELLOW}NOTE: Have these accounts ready before starting:${NC}"
echo "  - GitHub account (for all services)"
echo "  - Credit card (for Railway, may not charge immediately)"
echo ""

wait_for_enter

# ===========================
# Step 1: Neon Database
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1/6: Create Neon Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Visit: https://neon.tech"
echo "2. Sign up with GitHub"
echo "3. Create a new project: 'Preventli Production'"
echo "4. Select region: US East (or closest to your users)"
echo "5. Copy the connection string (looks like: postgresql://user:pass@...)"
echo ""

prompt_input "Paste your Neon DATABASE_URL here:" DATABASE_URL

# Validate DATABASE_URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo -e "${RED}ERROR: DATABASE_URL must start with 'postgresql://'${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL saved"

# Test database connection
echo ""
echo "Testing database connection..."

export DATABASE_URL="$DATABASE_URL"

if command -v npm &> /dev/null; then
    # Run a quick connection test
    node <<'EOF'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()')
  .then(() => { console.log('✅ Database connection successful!'); process.exit(0); })
  .catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); });
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Database connection test failed. Please check your DATABASE_URL.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found, skipping connection test${NC}"
fi

# ===========================
# Step 2: Railway Project
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2/6: Create Railway Project"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Visit: https://railway.app"
echo "2. Sign in with GitHub"
echo "3. Click 'New Project'"
echo "4. Select 'Deploy from GitHub repo'"
echo "5. Choose the 'GPNET3' repository"
echo ""

wait_for_enter

# ===========================
# Step 3: Railway Environment Variables
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3/6: Configure Railway Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "In Railway dashboard, click 'Variables' tab and add these:"
echo ""
echo "Required variables:"
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo "NODE_ENV=production"
echo "JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'GENERATE_THIS_MANUALLY')"
echo "SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'GENERATE_THIS_MANUALLY')"
echo "PORT=10000"
echo ""
echo "Optional but recommended:"
echo ""
echo "LLM_PROVIDER=openrouter"
echo "OPENROUTER_API_KEY=<get from https://openrouter.ai>"
echo ""
echo "STORAGE_PROVIDER=s3"
echo "S3_BUCKET=preventli-uploads"
echo "S3_REGION=auto"
echo "S3_ENDPOINT=<get from Cloudflare R2>"
echo "S3_ACCESS_KEY=<from R2>"
echo "S3_SECRET_KEY=<from R2>"
echo ""
echo "EMAIL_PROVIDER=resend"
echo "RESEND_API_KEY=<get from https://resend.com>"
echo "EMAIL_FROM=noreply@preventli.au"
echo ""
echo "SENTRY_DSN=<get from https://sentry.io>"
echo ""

echo -e "${YELLOW}TIP: Copy the above block and paste into Railway's 'Raw Editor' mode${NC}"
echo ""

wait_for_enter

# ===========================
# Step 4: Deploy Backend
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4/6: Deploy Backend to Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. In Railway, click 'Deploy'"
echo "2. Wait for build to complete (~2-3 minutes)"
echo "3. Once deployed, click 'Settings' → 'Public Networking'"
echo "4. Click 'Generate Domain'"
echo "5. Copy the URL (e.g., preventli-api.up.railway.app)"
echo ""

prompt_input "Paste your Railway backend URL here (without https://):" RAILWAY_URL

# Add https:// prefix if not present
if [[ ! "$RAILWAY_URL" =~ ^https?:// ]]; then
    RAILWAY_URL="https://$RAILWAY_URL"
fi

echo -e "${GREEN}✓${NC} Railway URL: $RAILWAY_URL"

# ===========================
# Step 5: Run Database Migrations
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5/6: Run Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Running migrations against production database..."
echo ""

if command -v npm &> /dev/null; then
    export DATABASE_URL="$DATABASE_URL"
    
    npm run db:push
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Database schema created successfully"
        echo ""
        
        # Seed compliance rules
        echo "Seeding initial data (compliance rules, etc.)..."
        npm run seed || echo -e "${YELLOW}⚠ Seed script completed with warnings (may be expected)${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        echo "Check error above. You may need to run migrations manually."
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found, skipping automatic migration${NC}"
    echo ""
    echo "Run these commands manually:"
    echo ""
    echo "  export DATABASE_URL='$DATABASE_URL'"
    echo "  npm run db:push"
    echo "  npm run seed"
fi

wait_for_enter

# ===========================
# Step 6: Deploy Frontend to Vercel
# ===========================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 6/6: Deploy Frontend to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1. Visit: https://vercel.com"
echo "2. Sign in with GitHub"
echo "3. Click 'Add New Project'"
echo "4. Import 'GPNET3' repository"
echo "5. Framework Preset: Vite"
echo "6. Root Directory: ./"
echo "7. Build Command: npm run build"
echo "8. Output Directory: dist"
echo ""
echo "9. Add Environment Variable:"
echo "   Key: VITE_API_URL"
echo "   Value: $RAILWAY_URL"
echo ""
echo "10. Click 'Deploy'"
echo ""

wait_for_enter

# ===========================
# Final Summary
# ===========================
echo ""
echo "=============================================="
echo -e "${GREEN}✅ Infrastructure Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "Your infrastructure:"
echo ""
echo "  Database:  Neon Postgres"
echo "  Backend:   $RAILWAY_URL"
echo "  Frontend:  https://gpnet3.vercel.app (or your custom domain)"
echo ""
echo "Next steps:"
echo ""
echo "  1. Test backend health: curl $RAILWAY_URL/health"
echo "  2. Visit your Vercel URL and test login"
echo "  3. Run verification script: ./scripts/verify-production.sh"
echo "  4. Set up custom domain in Vercel (optional)"
echo "  5. Configure monitoring (Sentry, etc.)"
echo ""
echo "See docs/infrastructure-setup.md for detailed documentation."
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
echo ""
