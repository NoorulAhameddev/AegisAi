import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

// STRICT SECURITY: Fail if secrets are missing in ALL environments
if (!process.env.JWT_ACCESS_SECRET) {
  throw new Error("FATAL: JWT_ACCESS_SECRET is not defined. Set it in your .env file.");
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("FATAL: JWT_REFRESH_SECRET is not defined. Set it in your .env file.");
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

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

/**
 * Verify authentication from NextRequest and return user
 */
export async function verifyAuth(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return null;

    const payload = verifyAccessToken(token);
    
    // Get full user details from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        tokenVersion: true,
      },
    });

    // Verify token version matches (for instant session revocation)
    if (!user || user.tokenVersion !== payload.tokenVersion || user.isBanned) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

