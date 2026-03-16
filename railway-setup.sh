#!/bin/bash
set -e

echo "🚂 Railway Deployment Setup"
echo "============================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "📝 Step 1: Login to Railway"
echo "This will open your browser for authentication..."
railway login

echo ""
echo "📦 Step 2: Initialize Railway project"
cd /home/paul_clawdbot/dev/gpnet3
railway init

echo ""
echo "🔧 Step 3: Setting environment variables..."

# Set all required environment variables
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_fFMbDwvW74XL@ep-flat-tooth-a7ssa5ih-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
railway variables set NODE_ENV="production"
railway variables set PORT="10000"
railway variables set JWT_SECRET="/x9un7r6i+/DhhJqWdL42xFWcQcpEmpYT7DFOChbhRc="
railway variables set SESSION_SECRET="5TTM+Rmu346na/OH8ilwXDLghE6tLIduztfSIJDpUug="
railway variables set FRONTEND_URL="https://preventli.com.au"
railway variables set CLIENT_URL="https://preventli.com.au"
railway variables set APP_URL="https://preventli.com.au"
railway variables set ANTHROPIC_API_KEY="sk-ant-placeholder"
railway variables set FRESHDESK_DOMAIN="gpnet"
railway variables set FRESHDESK_API_KEY="1pMomC0RQaPakOT9uxX"
railway variables set ENABLE_NOTIFICATIONS="true"
railway variables set DEFAULT_ORGANIZATION_ID="preventli-org"
railway variables set NOTIFICATION_DEFAULT_EMAIL="admin@preventli.au"
railway variables set LOG_LEVEL="info"
railway variables set LOG_REQUESTS="true"

echo ""
echo "🚀 Step 4: Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run: railway domain"
echo "2. Copy the domain URL"
echo "3. Paste it in Discord"
echo ""
echo "To check deployment status: railway status"
echo "To view logs: railway logs"
