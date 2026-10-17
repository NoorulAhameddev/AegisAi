const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Production builds must be type-safe. No more ignoring errors.
    ignoreBuildErrors: false,
  },
  turbopack: {
    root: require("path").resolve(__dirname, "../.."), // Set to monorepo root
  },
  // Keep native lancedb bindings external so Turbopack doesn't try to place them in ESM chunks
  serverExternalPackages: ["@lancedb/lancedb", "pdfkit", "fontkit", "pdf-parse", "@napi-rs/canvas"],
  webpack: (config, options) => {
    if (!options.isServer) {
      // Don't bundle lancedb on client side
      config.resolve.alias["@lancedb/lancedb"] = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.openrouter.ai",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.openrouter.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

// Export with Sentry integration for error tracking and performance monitoring
module.exports = withSentryConfig(nextConfig, {
  // Sentry build-time configuration
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps (CI/CD only)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress Sentry CLI output in development
  silent: process.env.NODE_ENV === "development",

  // Upload source maps for better error stack traces
  widenClientFileUpload: true,

  // Disable Sentry SDK bundling in development for faster builds
  disableServerWebpackPlugin: process.env.NODE_ENV === "development",
  disableClientWebpackPlugin: process.env.NODE_ENV === "development",

  // Hide source maps from public access
  hideSourceMaps: true,

  // Automatically tree shake Sentry logger statements for production
  webpack: {
    treeshake: {
      removeDebugLogging: process.env.NODE_ENV === "production",
    },
  },
});
