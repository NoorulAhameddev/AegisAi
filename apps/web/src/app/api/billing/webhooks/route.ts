/**
 * POST /api/billing/webhooks
 * Stripe webhook handler for payment and subscription events
 * IMPORTANT: This endpoint must be public (no auth required)
 */

import { NextRequest, NextResponse } from "next/server";
import { stripeService } from "@/services/billing/stripe";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  // Rate limiting: 100 webhook requests per minute per IP
  const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const requestId = req.headers.get("x-request-id") || "";
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("Webhook signature missing", { requestId });
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const rawBody = await req.text();
    const event = stripeService.verifyWebhookSignature(rawBody, signature);

    logger.info("Stripe webhook received", { type: event.type, requestId });

    // Handle different event types
    switch (event.type) {
      // Payment successful
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await stripeService.handlePaymentSuccess(session);
        logger.info("Checkout session completed", {
          sessionId: session.id,
          requestId,
        });
        break;
      }

      // Subscription updated (renewal, status change, etc.)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await stripeService.handleSubscriptionUpdate(subscription);
        logger.info("Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          requestId,
        });
        break;
      }

      // Subscription deleted (manually cancelled)
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await stripeService.handleSubscriptionUpdate(subscription);
        logger.info("Subscription deleted", {
          subscriptionId: subscription.id,
          requestId,
        });
        break;
      }

      // Invoice payment succeeded
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.info("Invoice payment succeeded", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
          requestId,
        });
        break;
      }

      // Invoice payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn("Invoice payment failed", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          requestId,
        });
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.type}`, { requestId });
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error("Webhook processing failed", error as Error, { requestId });
    // Return 400 to signal to Stripe to retry
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 },
    );
  }
}
