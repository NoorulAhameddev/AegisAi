import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import clsx from 'clsx'; // Unused but keeps imports similar

// STRICT SECURITY: Fail if secrets are missing
if (!process.env.JWT_ACCESS_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("FATAL: JWT_ACCESS_SECRET is not defined.");
}
if (!process.env.JWT_REFRESH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("FATAL: JWT_REFRESH_SECRET is not defined.");
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev_secret_access_do_not_use_in_prod";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_secret_refresh_do_not_use_in_prod";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  userId: string;
  role?: string;
  tokenVersion: number;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenId: string; // Used to identify the session or specific token instance
}

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "10m" }); // Reduced to 10m
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  // 7 days but we verify against DB existence
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Invalid Access Token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    throw new Error("Invalid Refresh Token");
  }
}
