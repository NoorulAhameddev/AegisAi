/**
 * Stripe Payment Integration Service
 * Handles subscription management, checkout sessions, and webhook processing
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { TIER_CONFIGS, PricingTier } from '@/lib/pricing';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20' as any,
});

export class StripeService {
    /**
     * Create a checkout session for a subscription
     */
    async createCheckoutSession(userId: string, tier: PricingTier, returnUrl: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, stripeCustomerId: true }
            });

            if (!user?.email) {
                throw new Error('User not found');
            }

            const tierConfig = TIER_CONFIGS[tier];
            if (!tierConfig) {
                throw new Error(`Invalid tier: ${tier}`);
            }

            // Find or create Stripe customer
            let customerId = user.stripeCustomerId;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: { userId }
                });
                customerId = customer.id;

                // Save customer ID to database
                await prisma.user.update({
                    where: { id: userId },
                    data: { stripeCustomerId: customerId }
                });
            }

            // Create a checkout session
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Aegis AI - ${tierConfig.displayName} Plan`,
                            description: tierConfig.description,
                        },
                        unit_amount: tierConfig.monthlyPrice,
                        recurring: {
                            interval: 'month',
                            interval_count: 1,
                        }
                    },
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: returnUrl,
                allow_promotion_codes: true,
                metadata: {
                    userId,
                    tier
                }
            });

            logger.info('Stripe checkout session created', {
                userId,
                tier,
                sessionId: session.id
            });

            return session;
        } catch (error) {
            logger.error('Failed to create checkout session', error as Error, { userId, tier });
            throw error;
        }
    }

    /**
     * Get checkout session details
     */
    async getCheckoutSession(sessionId: string) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return session;
        } catch (error) {
            logger.error('Failed to retrieve checkout session', error as Error, { sessionId });
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(session: Stripe.Checkout.Session) {
        try {
            const userId = session.metadata?.userId;
            const tier = session.metadata?.tier as PricingTier;

            if (!userId || !tier) {
                logger.error('Invalid session metadata', new Error('Missing userId or tier'), { sessionId: session.id });
                return;
            }

            // Get subscription details
            if (!session.subscription) {
                throw new Error('No subscription found in session');
            }

            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

            // Update user subscription in database
            await prisma.user.update({
                where: { id: userId },
                data: {
                    plan: tier,
                    subscriptionEndsAt: new Date(subscription.current_period_end * 1000)
                }
            });

            // Create subscription record
            await prisma.subscription.create({
                data: {
                    userId,
                    plan: tier,
                    status: subscription.status,
                    stripeSessionId: session.id,
                    stripePriceId: subscription.items.data[0]?.price.id,
                    startDate: new Date(subscription.current_period_start * 1000),
                    endDate: new Date(subscription.current_period_end * 1000),
                }
            });

            // Record payment
            await prisma.payment.create({
                data: {
                    userId,
                    amount: (subscription.items.data[0]?.price.unit_amount || 0),
                    status: 'succeeded',
                    stripePaymentId: session.payment_intent as string,
                    description: `Subscription to ${tier} plan`,
                    metadata: {
                        subscriptionId: subscription.id,
                        tier
                    }
                }
            });

            logger.info('Payment processed successfully', {
                userId,
                tier,
                subscriptionId: subscription.id,
                amount: subscription.items.data[0]?.price.unit_amount
            });
        } catch (error) {
            logger.error('Failed to handle payment success', error as Error, { sessionId: session.id });
            throw error;
        }
    }

    /**
     * Handle subscription updates (including cancellations)
     */
    async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
        try {
            const userId = subscription.metadata?.userId;
            if (!userId) {
                logger.error('Invalid subscription metadata', new Error('Missing userId'), { subscriptionId: subscription.id });
                return;
            }

            if (subscription.status === 'active' || subscription.status === 'trialing') {
                // Subscription is active, update end date
                await prisma.subscription.updateMany({
                    where: {
                        userId,
                        stripePriceId: subscription.items.data[0]?.price.id
                    },
                    data: {
                        status: subscription.status,
                        endDate: new Date(subscription.current_period_end * 1000)
                    }
                });
            } else if (subscription.status === 'canceled') {
                // Subscription cancelled, revert to FREE tier
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        plan: 'FREE' as any,
                        subscriptionEndsAt: null
                    }
                });

                await prisma.subscription.updateMany({
                    where: { userId },
                    data: { status: 'cancelled', cancelledAt: new Date() }
                });

                logger.info('Subscription cancelled', { userId, subscriptionId: subscription.id });
            }
        } catch (error) {
            logger.error('Failed to handle subscription update', error as Error, { subscriptionId: subscription.id });
            throw error;
        }
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(userId: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { stripeCustomerId: true }
            });

            if (!user?.stripeCustomerId) {
                throw new Error('User has no Stripe customer ID');
            }

            // Get active subscription
            const subscriptions = await stripe.subscriptions.list({
                customer: user.stripeCustomerId,
                status: 'active'
            });

            if (subscriptions.data.length === 0) {
                throw new Error('No active subscription found');
            }

            // Cancel subscription
            const subscription = subscriptions.data[0];
            await stripe.subscriptions.cancel(subscription.id);

            // Update database
            await prisma.user.update({
                where: { id: userId },
                data: {
                    plan: 'FREE' as any,
                    subscriptionEndsAt: null
                }
            });

            logger.info('Subscription cancelled by user', { userId, subscriptionId: subscription.id });

            return subscription;
        } catch (error) {
            logger.error('Failed to cancel subscription', error as Error, { userId });
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body: string, signature: string): Stripe.Event {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('Webhook secret not configured');
        }

        return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }

    /**
     * Get billing portal session
     */
    async getBillingPortalSession(userId: string, returnUrl: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { stripeCustomerId: true }
            });

            if (!user?.stripeCustomerId) {
                throw new Error('User has no Stripe customer ID');
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: user.stripeCustomerId,
                return_url: returnUrl,
            });

            return session;
        } catch (error) {
            logger.error('Failed to create billing portal session', error as Error, { userId });
            throw error;
        }
    }

    /**
     * Get subscription status
     */
    async getSubscriptionStatus(userId: string) {
        try {
            const subs = await prisma.subscription.findMany({
                where: { userId },
                orderBy: { startDate: 'desc' },
                take: 1
            });

            const latestSub = subs[0];
            if (!latestSub) {
                return { status: 'free', plan: 'FREE' as const };
            }

            return {
                status: latestSub.status,
                plan: latestSub.plan,
                startDate: latestSub.startDate,
                endDate: latestSub.endDate
            };
        } catch (error) {
            logger.error('Failed to get subscription status', error as Error, { userId });
            return { status: 'error', plan: 'FREE' as const };
        }
    }

    /**
     * Get payment history
     */
    async getPaymentHistory(userId: string, limit = 10) {
        try {
            return await prisma.payment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });
        } catch (error) {
            logger.error('Failed to get payment history', error as Error, { userId });
            return [];
        }
    }
}

export const stripeService = new StripeService();
