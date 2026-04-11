import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  const [salt = "", expectedKey = ""] = String(storedHash).split(":");
  if (!salt || !expectedKey) return false;

  const derivedKey = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
  const expectedBuffer = Buffer.from(expectedKey, "hex");
  const actualBuffer = Buffer.from(derivedKey, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
