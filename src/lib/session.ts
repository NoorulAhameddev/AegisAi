import { verifyAccessToken } from "@/lib/auth";
import { NextRequest } from "next/server";

export function getUserFromRequest(req: Request | NextRequest) {
  let token: string | undefined;

  // Check for NextRequest cookies
  if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
    token = (req as any).cookies.get("auth_access")?.value;
    console.log("Session: Extracted token from NextRequest cookies:", token ? "Found" : "Missing");
  }

  // Fallback to header parsing
  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    // console.log("Session: Cookie header:", cookieHeader); // Be careful logging full cookies in prod
    if (cookieHeader) {
      const match = cookieHeader.match(/auth_access=([^;]+)/);
      token = match ? match[1] : undefined;
      console.log("Session: Extracted token from header fallback:", token ? "Found" : "Missing");
    }
  }

  if (!token) {
    console.log("Session: No token found");
    return null;
  }

  try {
    const payload = verifyAccessToken(token) as any;
    console.log("Session: Verified payload:", payload ? "Success" : "Failed");
    return payload;
  } catch (err) {
    console.error("Session: Verification failed:", err);
    return null;
  }
}
