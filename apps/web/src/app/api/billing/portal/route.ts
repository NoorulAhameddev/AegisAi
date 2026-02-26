/**
 * GET /api/billing/portal
 * Get Stripe billing portal link for subscription management
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { stripeService } from "@/services/billing/stripe";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const returnUrl =
      req.nextUrl.searchParams.get("return_url") ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`;

    // Get billing portal session
    const session = await stripeService.getBillingPortalSession(
      user.id,
      returnUrl,
    );

    logger.info("Billing portal session created", {
      userId: user.id,
      requestId,
    });

    return successResponse(
      {
        url: session.url,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to create billing portal session", error as Error, {
      requestId,
    });
    return errorResponse("Failed to access billing portal", {
      status: 500,
      requestId,
    });
  }
}
