import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  const hashToCompare = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");

  const originalBuffer = Buffer.from(originalHash, "hex");
  const compareBuffer = Buffer.from(hashToCompare, "hex");

  if (originalBuffer.length !== compareBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(originalBuffer, compareBuffer);
}
