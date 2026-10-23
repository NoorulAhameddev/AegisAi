/**
 * Request Tracing Infrastructure
 *
 * Provides end-to-end visibility into API request processing:
 * - Automatic request ID propagation
 * - Performance tracking at each stage
 * - Database query performance monitoring
 * - AI API latency tracking
 * - Error correlation with request context
 *
 * Usage:
 *   const tracer = new RequestTracer(requestId)
 *   tracer.startStage('rag-retrieval')
 *   // ... process RAG
 *   tracer.endStage('rag-retrieval')
 *   const report = tracer.getReport()  // Get performance analytics
 */

interface TraceStage {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: Error;
}

interface TraceReport {
  requestId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  stages: Array<{
    name: string;
    duration: number;
    metadata?: Record<string, any>;
    error?: string;
  }>;
  summary: {
    fastest: string;
    slowest: string;
    totalTime: number;
    critical: boolean;
  };
}

export class RequestTracer {
  private requestId: string;
  private startTime: number = Date.now();
  private stages: Map<string, TraceStage> = new Map();
  private currentStage?: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Start timing a processing stage
   */
  startStage(stageName: string, metadata?: Record<string, any>) {
    if (this.currentStage) {
      this.endStage(this.currentStage);
    }

    const stage: TraceStage = {
      name: stageName,
      startTime: performance.now(),
      metadata,
    };

    this.stages.set(stageName, stage);
    this.currentStage = stageName;

    return {
      stageName,
      startTime: stage.startTime,
    };
  }

  /**
   * End timing for current stage
   */
  endStage(stageName: string, metadata?: Record<string, any>) {
    const stage = this.stages.get(stageName);
    if (!stage) return;

    const endTime = performance.now();
    stage.endTime = endTime;
    stage.duration = endTime - stage.startTime;

    if (metadata) {
      stage.metadata = { ...stage.metadata, ...metadata };
    }

    return {
      stageName,
      duration: stage.duration,
      metadata: stage.metadata,
    };
  }

  /**
   * Record an error for a stage
   */
  recordError(stageName: string, error: Error) {
    const stage = this.stages.get(stageName);
    if (stage) {
      stage.error = error;
      if (!stage.endTime) {
        stage.endTime = performance.now();
        stage.duration = stage.endTime - stage.startTime;
      }
    }
  }

  /**
   * Get complete trace report
   */
  getReport(): TraceReport {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;

    const stagesArray = Array.from(this.stages.values()).map((stage) => ({
      name: stage.name,
      duration: stage.duration || 0,
      metadata: stage.metadata,
      error: stage.error?.message,
    }));

    // Find fastest and slowest stages
    const sortedByDuration = [...stagesArray].sort(
      (a, b) => a.duration - b.duration,
    );
    const fastest = sortedByDuration[0]?.name || "unknown";
    const slowest =
      sortedByDuration[sortedByDuration.length - 1]?.name || "unknown";

    // Flag as critical if any stage > 3000ms
    const critical = stagesArray.some((s) => s.duration > 3000);

    return {
      requestId: this.requestId,
      startTime: this.startTime,
      endTime,
      totalDuration,
      stages: stagesArray,
      summary: {
        fastest,
        slowest,
        totalTime: Math.round(totalDuration),
        critical,
      },
    };
  }

  /**
   * Log report to structured logger
   */
  logReport(logger: any) {
    const report = this.getReport();

    logger.info("Request trace report", {
      requestId: report.requestId,
      totalDuration: report.summary.totalTime,
      stages: report.stages.map((s) => ({
        name: s.name,
        duration: Math.round(s.duration),
        error: s.error,
      })),
      critical: report.summary.critical,
    });

    // Log detailed stage breakdown
    report.stages.forEach((stage) => {
      if (stage.error) {
        logger.warn(`Stage failed: ${stage.name}`, {
          requestId: report.requestId,
          duration: Math.round(stage.duration),
          error: stage.error,
        });
      }

      if (stage.duration > 1000) {
        logger.warn(`Stage slow: ${stage.name}`, {
          requestId: report.requestId,
          duration: Math.round(stage.duration),
        });
      }
    });
  }
}

/**
 * Global trace collector for aggregating statistics
 */
export class TraceCollector {
  private traces: TraceReport[] = [];
  private maxTraces: number = 1000; // Keep last 1000 traces for analysis

  /**
   * Record a completed trace
   */
  record(report: TraceReport) {
    this.traces.push(report);

    // Trim old traces if exceeding limit
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces);
    }
  }

  /**
   * Get aggregated statistics for analysis
   */
  getStats(stageName?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
    errors: number;
  } {
    let traces = this.traces;

    // Filter by stage if specified
    if (stageName) {
      traces = traces.filter((t) => t.stages.some((s) => s.name === stageName));
    }

    if (traces.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errors: 0,
      };
    }

    const durations = traces
      .flatMap((t) =>
        stageName
          ? t.stages.filter((s) => s.name === stageName).map((s) => s.duration)
          : [t.totalDuration ?? 0],
      )
      .filter((d): d is number => typeof d === "number")
      .sort((a, b) => a - b);

    const errors = traces.filter((t) =>
      stageName
        ? t.stages.some((s) => s.name === stageName && s.error)
        : t.stages.some((s) => s.error),
    ).length;

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      count: durations.length,
      avgDuration: Math.round(avg),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      errors,
    };
  }

  /**
   * Get summary report
   */
  getSummary() {
    const stages = new Set<string>();
    this.traces.forEach((t) => t.stages.forEach((s) => stages.add(s.name)));

    return {
      totalTraces: this.traces.length,
      stages: Array.from(stages).map((stage) => ({
        name: stage,
        stats: this.getStats(stage),
      })),
    };
  }

  /**
   * Clear collected traces
   */
  clear() {
    this.traces = [];
  }
}

// Global instance
export const globalTraceCollector = new TraceCollector();
