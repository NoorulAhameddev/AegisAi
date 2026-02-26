/**
 * Pricing Configuration & Tier Definitions
 * Defines tiers, limits, pricing, and features
 */

export enum PricingTier {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export interface TierConfig {
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number; // in cents (e.g., 999 = $9.99)
  yearlyPrice?: number; // optional yearly discount

  // Token & API Limits
  monthlyTokenLimit: number; // Max tokens per month
  requestsPerMinute: number; // Rate limit
  maxContextLength: number; // Max context in characters
  maxChatsPerMonth: number; // Max conversations

  // Features
  features: {
    rag: boolean; // Retrieval Augmented Generation
    streaming: boolean; // Streaming responses
    fileUpload: boolean; // File upload support
    imageGeneration: boolean; // DALL-E integration
    voiceInput: boolean; // Voice to text
    export: boolean; // Export conversations (PDF, MD)
    customPrompts: boolean; // Save custom prompts
    collaborativeChats: boolean; // Share chats with team
    advancedAnalytics: boolean; // Usage analytics
    apiAccess: boolean; // Public API access
    customModels: boolean; // Choose different AI models
    prioritySupport: boolean; // Email support
  };
}

/**
 * Tier Configurations
 */
export const TIER_CONFIGS: Record<PricingTier, TierConfig> = {
  // FREE TIER
  [PricingTier.FREE]: {
    name: PricingTier.FREE,
    displayName: "Free",
    description: "Perfect for trying out Aegis AI",
    monthlyPrice: 0,

    monthlyTokenLimit: 10_000, // 10K tokens/month (roughly 5K words)
    requestsPerMinute: 5, // 5 requests/min
    maxContextLength: 50_000, // 50K chars max context
    maxChatsPerMonth: 10, // 10 conversations

    features: {
      rag: false,
      streaming: true,
      fileUpload: false,
      imageGeneration: false,
      voiceInput: false,
      export: false,
      customPrompts: false,
      collaborativeChats: false,
      advancedAnalytics: false,
      apiAccess: false,
      customModels: false,
      prioritySupport: false,
    },
  },

  // PRO TIER
  [PricingTier.PRO]: {
    name: PricingTier.PRO,
    displayName: "Pro",
    description: "For power users and students",
    monthlyPrice: 999, // $9.99/month
    yearlyPrice: 9990, // $99.90/year (~17% discount)

    monthlyTokenLimit: 500_000, // 500K tokens/month (~250K words)
    requestsPerMinute: 30, // 30 requests/min
    maxContextLength: 500_000, // 500K chars
    maxChatsPerMonth: 500, // 500 conversations

    features: {
      rag: true,
      streaming: true,
      fileUpload: true,
      imageGeneration: true,
      voiceInput: true,
      export: true,
      customPrompts: true,
      collaborativeChats: false, // Tier 2.1 feature
      advancedAnalytics: true,
      apiAccess: false,
      customModels: false,
      prioritySupport: true,
    },
  },

  // ENTERPRISE TIER
  [PricingTier.ENTERPRISE]: {
    name: PricingTier.ENTERPRISE,
    displayName: "Enterprise",
    description: "For teams and organizations (custom pricing)",
    monthlyPrice: 0, // Custom pricing via sales

    monthlyTokenLimit: 10_000_000, // 10M tokens/month (unlimited effectively)
    requestsPerMinute: 1000, // 1000 requests/min
    maxContextLength: 10_000_000, // 10M chars
    maxChatsPerMonth: 100_000, // 100K conversations

    features: {
      rag: true,
      streaming: true,
      fileUpload: true,
      imageGeneration: true,
      voiceInput: true,
      export: true,
      customPrompts: true,
      collaborativeChats: true,
      advancedAnalytics: true,
      apiAccess: true,
      customModels: true,
      prioritySupport: true,
    },
  },
};

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: PricingTier | string): TierConfig | null {
  return TIER_CONFIGS[tier as PricingTier] || null;
}

/**
 * Get monthly token limit for a user
 */
export function getMonthlyTokenLimit(tier: PricingTier | string): number {
  const config = getTierConfig(tier);
  return (
    config?.monthlyTokenLimit ||
    TIER_CONFIGS[PricingTier.FREE].monthlyTokenLimit
  );
}

/**
 * Get rate limit (requests per minute) for a tier
 */
export function getRateLimit(tier: PricingTier | string): number {
  const config = getTierConfig(tier);
  return (
    config?.requestsPerMinute ||
    TIER_CONFIGS[PricingTier.FREE].requestsPerMinute
  );
}

/**
 * Check if a tier has a specific feature
 */
export function hasTierFeature(
  tier: PricingTier | string,
  feature: keyof TierConfig["features"],
): boolean {
  const config = getTierConfig(tier);
  return config?.features[feature] || false;
}

/**
 * Get all tiers for pricing page
 */
export function getAllTiers(): TierConfig[] {
  return Object.values(TIER_CONFIGS);
}

/**
 * Pricing plan comparison (for UI)
 */
export interface PricingComparison {
  tiers: PricingTier[];
  features: Array<{
    category: string;
    items: Array<{
      name: string;
      free?: unknown;
      pro?: unknown;
      enterprise?: unknown;
    }>;
  }>;
}

export function getPricingComparison(): PricingComparison {
  return {
    tiers: [PricingTier.FREE, PricingTier.PRO, PricingTier.ENTERPRISE],
    features: [
      {
        category: "Core Features",
        items: [
          {
            name: "Monthly Token Limit",
            free: "10K",
            pro: "500K",
            enterprise: "10M",
          },
          {
            name: "Streaming Responses",
            free: "✅",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Conversation Export",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
        ],
      },
      {
        category: "AI Capabilities",
        items: [
          {
            name: "RAG (Document Context)",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Image Generation (DALL-E)",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Voice Input",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Custom AI Models",
            free: "❌",
            pro: "❌",
            enterprise: "✅",
          },
        ],
      },
      {
        category: "Team & Organization",
        items: [
          {
            name: "Collaborative Chats",
            free: "❌",
            pro: "❌",
            enterprise: "✅",
          },
          {
            name: "Team Management",
            free: "❌",
            pro: "❌",
            enterprise: "✅",
          },
          {
            name: "Advanced Analytics",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "API Access",
            free: "❌",
            pro: "❌",
            enterprise: "✅",
          },
        ],
      },
      {
        category: "Support",
        items: [
          {
            name: "Community Support",
            free: "✅",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Email Support",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
          {
            name: "Priority Support",
            free: "❌",
            pro: "✅",
            enterprise: "✅",
          },
        ],
      },
    ],
  };
}
