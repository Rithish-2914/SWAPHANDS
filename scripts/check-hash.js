// scripts/check-hash.js
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = String(stored).split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64));
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

(async () => {
  const raw = "MyPassword123!";
  const stored = await hashPassword(raw);
  console.log("stored:", stored);
  console.log("compare correct:", await comparePasswords(raw, stored)); // should be true
  console.log("compare wrong:", await comparePasswords("nope", stored)); // should be false
})();
