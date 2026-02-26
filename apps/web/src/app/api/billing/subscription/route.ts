/**
 * DELETE /api/billing/subscription
 * Cancel user subscription (revert to FREE tier)
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { stripeService } from "@/services/billing/stripe";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    // Cancel subscription
    await stripeService.cancelSubscription(user.id);

    logger.info("Subscription cancelled", { userId: user.id, requestId });

    return successResponse(
      {
        message: "Subscription cancelled. Reverted to FREE tier.",
        plan: "FREE",
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to cancel subscription", error as Error, {
      userId: req.headers.get("x-user-id"),
      requestId,
    });
    return errorResponse("Failed to cancel subscription", {
      status: 500,
      requestId,
    });
  }
}

/**
 * GET /api/billing/subscription
 * Get current subscription status
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const status = await stripeService.getSubscriptionStatus(user.id);

    return successResponse(status, { requestId });
  } catch (error) {
    logger.error("Failed to get subscription status", error as Error, {
      requestId,
    });
    return errorResponse("Failed to get subscription status", {
      status: 500,
      requestId,
    });
  }
}
