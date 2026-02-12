import { NextRequest } from 'next/server';
import { verifyAuth } from '@/services/auth/auth';
import { globalTraceCollector } from '@/lib/request-tracer';
import { successResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/response';

/**
 * GET /api/admin/analytics/traces
 * 
 * Returns performance analytics from collected request traces
 * Admin only endpoint
 */
export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  // Check admin role
  if (user.role !== 'ADMIN') {
    return forbiddenResponse({
      message: 'Only admins can view trace analytics'
    });
  }

  try {
    const summary = globalTraceCollector.getSummary();

    // Get detailed stats for each stage
    const stageDetails = summary.stages.map(stage => ({
      ...stage,
      percentile: {
        p50: stage.stats.p50,
        p95: stage.stats.p95,
        p99: stage.stats.p99
      }
    }));

    return successResponse({
      timestamp: new Date().toISOString(),
      summary: {
        totalTracedRequests: summary.totalTraces,
        stageCount: summary.stages.length
      },
      stages: stageDetails,
      slowestStages: stageDetails
        .sort((a, b) => b.stats.avgDuration - a.stats.avgDuration)
        .slice(0, 5),
      mostErrored: stageDetails
        .sort((a, b) => b.stats.errors - a.stats.errors)
        .filter(s => s.stats.errors > 0)
        .slice(0, 5),
      systemHealth: {
        healthy: stageDetails.every(s => s.stats.p99 < 5000),
        criticalIssues: stageDetails.filter(s => s.stats.p99 > 5000),
        recommendation: recommendOptimizations(stageDetails)
      }
    });
  } catch (error) {
    console.error('Failed to get trace analytics:', error);
    return successResponse({
      message: 'No trace data available yet',
      summary: {
        totalTracedRequests: 0,
        stageCount: 0
      },
      stages: []
    });
  }
}

function recommendOptimizations(styleDetails: any[]): string[] {
  const recommendations = [];

  // Check for slow stages
  const slowStages = styleDetails.filter(s => s.stats.avgDuration > 1000);
  if (slowStages.length > 0) {
    recommendations.push(
      `Optimize these slow stages: ${slowStages.map(s => s.name).join(', ')}`
    );
  }

  // Check for high error rates
  const errorStages = styleDetails.filter(s => s.stats.errors > 0);
  if (errorStages.length > 0) {
    recommendations.push(
      `Investigate error sources: ${errorStages.map(s => s.name).join(', ')}`
    );
  }

  // Check for P99 > 3s (critical)
  const criticalStages = styleDetails.filter(s => s.stats.p99 > 3000);
  if (criticalStages.length > 0) {
    recommendations.push(
      'CRITICAL: P99 latency >3s for: ' +
      criticalStages.map(s => `${s.name} (${s.stats.p99}ms)`).join(', ')
    );
  }

  return recommendations.length > 0 ? recommendations : ['System performing well'];
}

/**
 * POST /api/admin/analytics/traces/reset
 * 
 * Reset collected traces
 */
export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'ADMIN') {
    return forbiddenResponse({
      message: 'Only admins can reset traces'
    });
  }

  globalTraceCollector.clear();

  return successResponse({
    message: 'Trace data cleared',
    timestamp: new Date().toISOString()
  });
}
