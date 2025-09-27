import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const email = "bajjuri.rithish2025@vitstudent.ac.in";
    const res = await pool.query(
      'DELETE FROM users WHERE email = $1 RETURNING id',
      [email]
    );

    if (res.rowCount === 0) {
      console.log(`No user found with email: ${email}`);
    } else {
      console.log(`Successfully deleted user with id: ${res.rows[0].id}`);
    }
  } catch (err) {
    console.error("❌ Error deleting user:", err);
  } finally {
    await pool.end();
  }
})();