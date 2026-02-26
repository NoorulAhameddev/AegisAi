/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { stripeService } from "@/services/billing/stripe";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { PricingTier } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const { tier } = await req.json();

    // Validate tier
    if (!Object.values(PricingTier).includes(tier)) {
      return errorResponse("Invalid pricing tier", { status: 400, requestId });
    }

    // Get return URL from header (where to redirect after checkout)
    const returnUrl =
      req.headers.get("x-return-url") ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings/billing`;

    // Create checkout session
    const session = await stripeService.createCheckoutSession(
      user.id,
      tier,
      returnUrl,
    );

    logger.info("Checkout session requested", {
      userId: user.id,
      tier,
      requestId,
    });

    return successResponse(
      {
        sessionId: session.id,
        url: session.url,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Checkout creation failed", error as Error, { requestId });
    return errorResponse("Failed to create checkout session", {
      status: 500,
      requestId,
    });
  }
}
