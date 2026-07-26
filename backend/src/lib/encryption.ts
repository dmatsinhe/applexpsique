import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env, requireEncryptionKey } from "../config/env.js";

// AES-256-GCM for sensitive fields at rest (check-in answers, rendered
// session content) — see docs/database-schema.md. Ciphertext layout:
// base64(iv[12] || authTag[16] || ciphertext).

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function loadKey(): Buffer {
  const keyBase64 = env.encryptionKeyBase64 || requireEncryptionKey();
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes for AES-256-GCM",
    );
  }
  return key;
}

export function encryptField(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptField(encoded: string): string {
  const key = loadKey();
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
