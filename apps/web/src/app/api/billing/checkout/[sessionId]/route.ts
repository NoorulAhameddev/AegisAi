/**
 * GET /api/billing/checkout/:sessionId
 * Get checkout session status
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const { sessionId } = await params;

    // Get session from Stripe
    const session = await stripeService.getCheckoutSession(sessionId);

    // Verify session belongs to user
    if (session.metadata?.userId !== user.id) {
      return errorResponse("Unauthorized", { status: 403, requestId });
    }

    return successResponse(
      {
        status: session.payment_status,
        subscriptionStatus: session.subscription ? "active" : "pending",
        tier: session.metadata?.tier,
        customer: session.customer,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to get checkout session", error as Error, {
      requestId,
    });
    return errorResponse("Failed to get session status", {
      status: 500,
      requestId,
    });
  }
}
