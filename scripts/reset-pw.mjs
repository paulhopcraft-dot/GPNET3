import bcrypt from 'bcrypt';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Whc@0102030405@localhost:5432/gpnet' });
const hash = await bcrypt.hash('ChangeMe123!', 10);
const result = await pool.query(`UPDATE users SET password = $1 WHERE email = 'employer@symmetry.local' RETURNING email, role`, [hash]);
if (result.rowCount === 0) {
  const users = await pool.query('SELECT email, role FROM users LIMIT 10');
  console.log('Not found. Users:', users.rows);
} else {
  console.log('Reset:', result.rows[0]);
}
await pool.end();
