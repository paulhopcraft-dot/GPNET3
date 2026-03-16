#!/usr/bin/env bash
set -euo pipefail

# Preventli Database Setup Script
# Verifies DATABASE_URL, connects, runs migrations, and seeds initial data

echo "🔧 Preventli Database Setup"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set DATABASE_URL to your Neon or PostgreSQL connection string:"
    echo ""
    echo "  export DATABASE_URL='postgresql://user:pass@host.neon.tech/dbname?sslmode=require'"
    echo ""
    echo "Or create a .env file in the project root with:"
    echo ""
    echo "  DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is set"
echo ""

# Validate DATABASE_URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL must start with 'postgresql://'${NC}"
    echo "Current value: $DATABASE_URL"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL format is valid"
echo ""

# Test database connection using Node.js
echo "🔌 Testing database connection..."
echo ""

node <<'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log('✅ Database connection successful!');
    console.log('');
    console.log('Server time:', result.rows[0].now);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    console.log('');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('');
    console.error('Common issues:');
    console.error('  - Database host unreachable (check network/firewall)');
    console.error('  - Invalid credentials (check username/password)');
    console.error('  - SSL required but not enabled (add ?sslmode=require to URL)');
    console.error('  - Database does not exist (create it in Neon dashboard)');
    console.error('');
    process.exit(1);
  }
}

testConnection();
EOF

if [ $? -ne 0 ]; then
    exit 1
fi

echo -e "${GREEN}✓${NC} Database connection test passed"
echo ""

# Run database migrations
echo "📊 Running database migrations..."
echo ""

if [ -f "node_modules/.bin/drizzle-kit" ]; then
    npm run db:push
    MIGRATION_EXIT_CODE=$?
else
    echo -e "${YELLOW}⚠ Warning: drizzle-kit not found. Installing dependencies...${NC}"
    npm install
    npm run db:push
    MIGRATION_EXIT_CODE=$?
fi

if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Migration failed${NC}"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✓${NC} Database schema created successfully"
echo ""

# Check if seed script exists
if [ -f "server/seed.ts" ] || [ -f "server/seed.js" ]; then
    echo "🌱 Seeding initial data..."
    echo ""
    
    npm run seed
    SEED_EXIT_CODE=$?
    
    if [ $SEED_EXIT_CODE -ne 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Warning: Seed script failed or returned non-zero exit code${NC}"
        echo "This might be expected if data already exists."
        echo ""
    else
        echo ""
        echo -e "${GREEN}✓${NC} Initial data seeded successfully"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠ No seed script found (server/seed.ts or server/seed.js)${NC}"
    echo "Skipping initial data seeding."
    echo ""
fi

# Verify tables were created
echo "🔍 Verifying database schema..."
echo ""

node <<'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function verifySchema() {
  try {
    const client = await pool.connect();
    
    // List all tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (result.rows.length === 0) {
      console.error('❌ No tables found in database');
      process.exit(1);
    }
    
    console.log('✅ Found', result.rows.length, 'tables in database:');
    console.log('');
    result.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    console.log('');
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema verification failed:', err.message);
    process.exit(1);
  }
}

verifySchema();
EOF

if [ $? -ne 0 ]; then
    exit 1
fi

echo -e "${GREEN}✓${NC} Database schema verification passed"
echo ""

# Final summary
echo "=============================="
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo "=============================="
echo ""
echo "Next steps:"
echo "  1. Deploy backend to Railway"
echo "  2. Add DATABASE_URL to Railway environment variables"
echo "  3. Deploy frontend to Vercel"
echo "  4. Configure VITE_API_URL in Vercel"
echo ""
echo "See docs/infrastructure-setup.md for detailed instructions."
echo ""
