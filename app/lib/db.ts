import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let dbAvailable: boolean | null = null;

async function checkDb() {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.warn('Database unavailable — history logging disabled.');
  }
}

checkDb();

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export function isDbAvailable(): boolean {
  return dbAvailable === true;
}
