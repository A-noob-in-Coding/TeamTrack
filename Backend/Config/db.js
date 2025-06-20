import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Function to test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('🌐 Connected to PostgreSQL');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
};

pool.on('connect', () => {
  console.log('🔗 New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

export default pool;
