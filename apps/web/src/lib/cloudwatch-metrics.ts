/**
 * CloudWatch Embedded Metrics Integration
 *
 * Complements the existing in-memory metrics with CloudWatch publishing.
 * Uses AWS Embedded Metrics Format (EMF) for zero CloudWatch API calls.
 *
 * Integration: Wraps existing metrics functions to publish to CloudWatch
 */

import { createMetricsLogger, Unit } from "aws-embedded-metrics";
import type { MetricsLogger } from "aws-embedded-metrics";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_AWS = process.env.AWS_ECS_FARGATE || process.env.AWS_EXECUTION_ENV;

/**
 * Create a metrics logger for CloudWatch
 */
async function createLogger(
  namespace: string = "AegisAI",
): Promise<MetricsLogger | null> {
  // Only publish to CloudWatch in production AWS environments
  if (!IS_PRODUCTION || !IS_AWS) {
    return null;
  }

  const metrics = createMetricsLogger();
  metrics.setNamespace(namespace);
  metrics.setDimensions({
    Environment: process.env.NODE_ENV || "development",
    Service: "AegisAI",
  });

  return metrics;
}

/**
 * Publish queue depth metric to CloudWatch
 */
export async function publishQueueDepthMetric(
  queueName: string,
  depth: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("QueueDepth", depth, Unit.Count);
  metrics.setDimensions({ QueueName: queueName });
  await metrics.flush();
}

/**
 * Publish worker latency metric to CloudWatch
 */
export async function publishWorkerLatencyMetric(
  workerType: string,
  latencyMs: number,
  percentile?: "p50" | "p95" | "p99",
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  const metricName = percentile
    ? `JobProcessingLatency_${percentile}`
    : "JobProcessingLatency";
  metrics.putMetric(metricName, latencyMs, Unit.Milliseconds);
  metrics.setDimensions({ WorkerType: workerType });
  await metrics.flush();
}

/**
 * Publish job success/failure rate to CloudWatch
 */
export async function publishJobFailureRateMetric(
  workerType: string,
  failureRate: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("JobFailureRate", failureRate, Unit.Percent);
  metrics.setDimensions({ WorkerType: workerType });
  await metrics.flush();
}

/**
 * Publish DB pool usage to CloudWatch
 */
export async function publishDBPoolUsageMetric(
  usagePercent: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("DBPoolUsage", usagePercent, Unit.Percent);
  await metrics.flush();
}

/**
 * Publish API latency to CloudWatch
 */
export async function publishAPILatencyMetric(
  route: string,
  latencyMs: number,
  statusCode: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("RequestLatency", latencyMs, Unit.Milliseconds);
  metrics.setDimensions({
    Route: route,
    StatusCode: `${Math.floor(statusCode / 100)}xx`,
  });

  // Track error rates
  if (statusCode >= 500) {
    metrics.putMetric("5xxErrors", 1, Unit.Count);
  }

  await metrics.flush();
}

/**
 * Publish OpenAI API metrics to CloudWatch
 */
export async function publishOpenAIMetrics(
  latencyMs: number,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("OpenAILatency", latencyMs, Unit.Milliseconds);
  metrics.putMetric("TokenUsage", promptTokens + completionTokens, Unit.Count);
  metrics.putMetric("PromptTokens", promptTokens, Unit.Count);
  metrics.putMetric("CompletionTokens", completionTokens, Unit.Count);

  await metrics.flush();
}

/**
 * Publish token budget exhausted event to CloudWatch
 */
export async function publishTokenBudgetExhaustedMetric(
  userId: string,
  tier: string,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("TokenBudgetExhausted", 1, Unit.Count);
  metrics.setDimensions({ Tier: tier });

  await metrics.flush();
}

/**
 * Publish circuit breaker state to CloudWatch
 */
/**
 * Publish circuit breaker metrics to CloudWatch
 * Tracks circuit state, successes, failures, timeouts, fallbacks
 */
export async function publishCircuitBreakerMetric(
  service: string,
  state:
    | "OPEN"
    | "CLOSED"
    | "HALF_OPEN"
    | "success"
    | "failure"
    | "timeout"
    | "fallback",
  value: number = 1,
  metadata?: { latencyMs?: number; errorType?: string },
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  // State metrics (for alarms and dashboards)
  if (state === "OPEN") {
    metrics.putMetric("CircuitBreakerOpen", 1, Unit.Count);
  } else if (state === "CLOSED") {
    metrics.putMetric("CircuitBreakerOpen", 0, Unit.Count);
  } else if (state === "HALF_OPEN") {
    metrics.putMetric("CircuitBreakerHalfOpen", 1, Unit.Count);
  }

  // Event metrics
  if (state === "success") {
    metrics.putMetric("CircuitBreakerSuccess", value, Unit.Count);
    if (metadata?.latencyMs) {
      metrics.putMetric(
        "CircuitBreakerLatency",
        metadata.latencyMs,
        Unit.Milliseconds,
      );
    }
  } else if (state === "failure") {
    metrics.putMetric("CircuitBreakerFailure", value, Unit.Count);
    if (metadata?.errorType) {
      metrics.setProperty("errorType", metadata.errorType);
    }
  } else if (state === "timeout") {
    metrics.putMetric("CircuitBreakerTimeout", value, Unit.Count);
  } else if (state === "fallback") {
    metrics.putMetric("CircuitBreakerFallback", value, Unit.Count);
  }

  metrics.setDimensions({ Service: service });
  await metrics.flush();
}

/**
 * Publish user activity metrics to CloudWatch
 */
export async function publishUserActivityMetrics(
  activeUsers: number,
  messagesPerMinute: number,
  ragQueries: number,
): Promise<void> {
  const metrics = await createLogger();
  if (!metrics) return;

  metrics.putMetric("ActiveUsers", activeUsers, Unit.Count);
  metrics.putMetric("MessagesPerMinute", messagesPerMinute, Unit.Count);
  metrics.putMetric("RAGQueries", ragQueries, Unit.Count);

  await metrics.flush();
}

/**
 * Utility: Time an operation and publish metric
 */
export async function timeAndPublish<T>(
  metricName: string,
  dimensions: Record<string, string>,
  operation: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    const metrics = await createLogger();
    if (metrics) {
      metrics.putMetric(metricName, duration, Unit.Milliseconds);
      Object.entries(dimensions).forEach(([key, value]) => {
        metrics.setDimensions({ [key]: value });
      });
      await metrics.flush();
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    const metrics = await createLogger();
    if (metrics) {
      metrics.putMetric(`${metricName}Failed`, duration, Unit.Milliseconds);
      Object.entries(dimensions).forEach(([key, value]) => {
        metrics.setDimensions({ [key]: value });
      });
      await metrics.flush();
    }

    throw error;
  }
}
