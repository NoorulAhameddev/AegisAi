/**
 * GET /api/billing/pricing
 * Get pricing information and tier comparison
 */

import { NextRequest } from "next/server";
import { getAllTiers, getPricingComparison } from "@/lib/pricing";
import { successResponse } from "@/lib/response";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const tiers = getAllTiers();
    const comparison = getPricingComparison();

    return successResponse(
      {
        tiers: tiers.map((tier) => ({
          name: tier.name,
          displayName: tier.displayName,
          description: tier.description,
          monthlyPrice: tier.monthlyPrice,
          yearlyPrice: tier.yearlyPrice,
          limits: {
            monthlyTokens: tier.monthlyTokenLimit,
            requestsPerMinute: tier.requestsPerMinute,
            maxChatsPerMonth: tier.maxChatsPerMonth,
            maxContextLength: tier.maxContextLength,
          },
          features: tier.features,
        })),
        comparison,
        stripePricingLiveMode: process.env.NODE_ENV === "production",
      },
      { requestId },
    );
  } catch (error) {
    return successResponse(
      {
        error: "Failed to load pricing",
        tiers: [],
      },
      { requestId },
    );
  }
}
