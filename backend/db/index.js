const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon and other hosted PostgreSQL providers require SSL.
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;