import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const TOKEN_TTL = "7d";

function requireJwtSecret(): string {
  if (!env.jwtSecret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return env.jwtSecret;
}

export function issueToken(userId: string): string {
  return jwt.sign({ sub: userId }, requireJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): { userId: string } {
  const payload = jwt.verify(token, requireJwtSecret());
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Token inválido");
  }
  return { userId: payload.sub };
}
