/**
 * Webhook Signature Verification
 * Validates that webhooks originate from trusted services (Stripe, etc.)
 */

import crypto from "crypto";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Verify Stripe webhook signature
 * Returns true if signature is valid, false otherwise
 * 
 * @param payload - Raw request body (string)
 * @param signature - Stripe-Signature header value
 */
export function verifyStripeWebhook(
  payload: string,
  signature: string,
): boolean {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured - rejecting webhook");
    return false;
  }

  try {
    const parts = signature.split(",");
    const signatureMap: Record<string, string> = {};
    
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value) {
        signatureMap[key] = value;
      }
    }

    const timestamp = signatureMap["t"];
    const expectedSignature = signatureMap["v1"];

    if (!timestamp || !expectedSignature) {
      logger.warn("[Webhook] Missing timestamp or signature");
      return false;
    }

    // Check timestamp is within 5 minutes (prevents replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    
    if (currentTime - webhookTime > 300) {
      logger.warn("[Webhook] Webhook timestamp too old", {
        age: currentTime - webhookTime,
      });
      return false;
    }

    // Compute expected signature
    const payloadToSign = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac("sha256", env.STRIPE_WEBHOOK_SECRET!)
      .update(payloadToSign, "utf8")
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(expectedSignature, "hex");
    const compBuffer = Buffer.from(computedSignature, "hex");

    if (sigBuffer.length !== compBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, compBuffer);
  } catch (error) {
    logger.error("[Webhook] Signature verification failed", error as Error);
    return false;
  }
}

/**
 * Verify generic webhook with secret
 */
export function verifyWebhook(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256",
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload, "utf8")
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const compBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== compBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, compBuffer);
  } catch (error) {
    logger.error("[Webhook] Generic verification failed", error as Error);
    return false;
  }
}