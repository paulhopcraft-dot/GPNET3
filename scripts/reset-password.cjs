const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetPassword() {
  const hash = await bcrypt.hash('test123', 10);
  await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'admin@gpnet.local']);
  console.log('Password reset to: test123');
  await pool.end();
}

resetPassword();
