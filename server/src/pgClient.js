// import pkg from 'pg';
// import dotenv from 'dotenv';

// dotenv.config();

// const { Pool } = pkg;

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// export default pool;
import Database from 'better-sqlite3';

const db = new Database('calscheduler.db');

// mimic pg pool interface
export default {
  query(sql, params = []) {
    const stmt = db.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return { rows: stmt.all(params) };
    }
    stmt.run(params);
    return { rows: [] };
  },
  connect() {
    return this;
  },
  release() {},
  end() {}
};
