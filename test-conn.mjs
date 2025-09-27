import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

(async () => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const r = await pool.query("SELECT NOW()");
    console.log("✅ Connected! Current time:", r.rows[0]);
    await pool.end();
  } catch (err) {
    console.error("❌ Connection error:", err);
    process.exit(1);
  }
})();
