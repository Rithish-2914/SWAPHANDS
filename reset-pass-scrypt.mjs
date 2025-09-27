// reset-pass-scrypt.mjs
import "dotenv/config";
import pkg from "pg";
import { randomBytes, scryptSync } from "crypto";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = process.argv[2];
const newPassword = process.argv[3] || "TempPass123!";

if (!email) {
  console.error("Usage: node reset-pass-scrypt.mjs user@example.com [newPassword]");
  process.exit(1);
}

(async () => {
  try {
    // Generate salt + scrypt hash (64 bytes) — same as your auth code
    const salt = randomBytes(16).toString("hex");
    const derived = scryptSync(newPassword, salt, 64);
    const stored = `${derived.toString("hex")}.${salt}`; // hash.salt (matches auth)

    const res = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, created_at',
      [stored, email]
    );

    if (res.rowCount === 0) {
      console.error("No user found with that email.");
      await pool.end();
      process.exit(2);
    }

    console.log("✅ Password updated for:", res.rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    await pool.end();
    process.exit(1);
  }
})();
