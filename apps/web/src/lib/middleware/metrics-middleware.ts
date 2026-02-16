/**
 * Metrics Middleware for Next.js API Routes
 * 
 * Automatically tracks request metrics:
 * - Request count by route and status code
 * - Request latency (P50, P95, P99)
 * - Error rates (4xx, 5xx)
 * - Active users and concurrent requests
 * 
 * Usage in API route:
 * ```ts
 * import {with MetricsMiddleware } from '@/lib/middleware/metrics-middleware';
 * 
 * async function handler(req: NextRequest) {
 *   // Your route logic
 * }
 * 
 * export const POST = withMetricsMiddleware(handler);
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { publishAPILatencyMetric } from '../cloudwatch-metrics';
import { logger } from '../logger';

type NextRouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse | Response>;

/**
 * Extract route path from request URL
 */
function extractRoutePath(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove dynamic segments (UUIDs, etc.) for better grouping
    return urlObj.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  } catch {
    return '/unknown';
  }
}

/**
 * Wrap an API route handler with metrics collection
 */
export function withMetricsMiddleware(handler: NextRouteHandler): NextRouteHandler {
  return async (req: NextRequest, context?: any): Promise<NextResponse | Response> => {
    const startTime = Date.now();
    const route = extractRoutePath(req.url);
    const method = req.method;
    const requestId = req.headers.get('x-request-id') || 'unknown';

    try {
      // Execute the route handler
      const response = await handler(req, context);
      
      // Calculate latency
      const latency = Date.now() - startTime;
      const statusCode = response.status;

      // Publish metrics to CloudWatch
      try {
        await publishAPILatencyMetric(route, latency, statusCode);
      } catch (metricsError) {
        // Don't fail the request if metrics publishing fails
        logger.error('Failed to publish API metrics', metricsError as Error, {
          route,
          method,
          statusCode,
          latency,
        });
      }

      // Log request completion
      logger.info(`${method} ${route} ${statusCode}`, {
        requestId,
        latency,
        statusCode,
        route,
        method,
      });

      return response;
    } catch (error) {
      // Calculate latency for failed requests
      const latency = Date.now() - startTime;
      const statusCode = 500;

      // Publish error metrics
      try {
        await publishAPILatencyMetric(route, latency, statusCode);
      } catch (metricsError) {
        logger.error('Failed to publish error metrics', metricsError as Error);
      }

      // Log error
      logger.error(`${method} ${route} ${statusCode}`, error as Error, {
        requestId,
        latency,
        statusCode,
        route,
        method,
      });

      throw error;
    }
  };
}

/**
 * Simpler wrapper for routes that don't need context
 */
export function withMetrics(handler: (req: NextRequest) => Promise<NextResponse | Response>) {
  return withMetricsMiddleware(handler);
}
