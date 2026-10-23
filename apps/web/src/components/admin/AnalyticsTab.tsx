/**
 * Analytics Tab Component
 *
 * Real-time chat analytics dashboard for admin panel
 */

"use client";

import { useEffect, useState } from "react";
import { Activity, MessageSquare, Users, Flag, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/admin/charts/MetricCard";
import { TimeSeriesChart } from "@/components/admin/charts/TimeSeriesChart";
import { LiveIndicator } from "@/components/admin/charts/LiveIndicator";
import { PieChart } from "@/components/admin/charts/PieChart";
import { logger } from "@/lib/logger";

interface LiveMetrics {
  activeChats: number;
  messagesPerMinute: number;
  avgResponseTime: number;
  queueDepth: number;
  moderationFlags: number;
  timestamp: string;
}

interface HistoricalStats {
  messagesPerPeriod: Array<{
    period: string;
    count: number;
    userMessages: number;
    assistantMessages: number;
  }>;
  activeUsers: Array<{ period: string; count: number }>;
  tokenUsage: Array<{ period: string; total: number }>;
  moderationFlags: Array<{ period: string; count: number }>;
  totalMessages: number;
  totalChats: number;
  totalUsers: number;
}

interface SummaryStats {
  totalChats: number;
  totalMessages: number;
  activeUsers24h: number;
  flaggedContent: number;
  avgMessagesPerChat: number;
  avgTokensPerMessage: number;
}

export function AnalyticsTab() {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [historicalStats, setHistoricalStats] =
    useState<HistoricalStats | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  // Fetch summary and historical data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          fetch("/api/admin/analytics/chat/summary"),
          fetch(`/api/admin/analytics/chat/history?period=${selectedPeriod}`),
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummaryStats(summaryData.data);
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistoricalStats(historyData.data);
        }
      } catch (error) {
        logger.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Establish SSE connection for live metrics
  useEffect(() => {
    const eventSource = new EventSource("/api/admin/analytics/chat/stream");

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LiveMetrics;
        setLiveMetrics(data);
      } catch (error) {
        logger.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = () => {
      setSseConnected(false);
      logger.error("SSE connection error");
    };

    return () => {
      eventSource.close();
      setSseConnected(false);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-medium tracking-tight text-ink-100 flex items-center gap-2">
            <Activity className="h-6 w-6 text-brand" />
            Chat Analytics
          </h2>
          <p className="text-sm text-ink-400 mt-1">
            Real-time metrics and historical trends
          </p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator active={sseConnected} />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-ink-800 text-ink-100 border border-ink-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-ink-850 border border-hair p-4">
          <MetricCard
            title="Active Chats"
            value={liveMetrics?.activeChats ?? summaryStats?.totalChats ?? 0}
            icon={<MessageSquare className="h-5 w-5" />}
            loading={!liveMetrics && !summaryStats}
            subtitle="Last 5 minutes"
          />
        </div>
        <div className="bg-ink-850 border border-hair p-4">
          <MetricCard
            title="Messages/Min"
            value={liveMetrics?.messagesPerMinute ?? 0}
            icon={<TrendingUp className="h-5 w-5" />}
            loading={!liveMetrics}
            subtitle="Current rate"
          />
        </div>
        <div className="bg-ink-850 border border-hair p-4">
          <MetricCard
            title="Avg Response Time"
            value={liveMetrics ? `${liveMetrics.avgResponseTime}ms` : "0ms"}
            icon={<Activity className="h-5 w-5" />}
            loading={!liveMetrics}
            subtitle="Processing latency"
          />
        </div>
        <div className="bg-ink-850 border border-hair p-4">
          <MetricCard
            title="Flagged Content"
            value={summaryStats?.flaggedContent ?? 0}
            icon={<Flag className="h-5 w-5" />}
            loading={!summaryStats}
            subtitle="Requires review"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-ink-850 border border-hair p-6">
          <div className="text-sm text-ink-400 mb-1">Total Messages</div>
          <div className="text-3xl font-display font-medium tracking-tight text-ink-100">
            {summaryStats?.totalMessages.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-ink-500 mt-2">
            Avg {summaryStats?.avgMessagesPerChat.toFixed(1)} per chat
          </div>
        </div>
        <div className="bg-ink-850 border border-hair p-6">
          <div className="text-sm text-ink-400 mb-1">Active Users (24h)</div>
          <div className="text-3xl font-display font-medium tracking-tight text-ink-100">
            {summaryStats?.activeUsers24h.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-ink-500 mt-2">
            {summaryStats?.totalChats.toLocaleString()} total chats
          </div>
        </div>
        <div className="bg-ink-850 border border-hair p-6">
          <div className="text-sm text-ink-400 mb-1">Avg Tokens/Message</div>
          <div className="text-3xl font-display font-medium tracking-tight text-ink-100">
            {summaryStats?.avgTokensPerMessage.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-ink-500 mt-2">Per message average</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Trends */}
        <TimeSeriesChart
          title="Message Volume"
          data={
            historicalStats?.messagesPerPeriod.map((item) => ({
              period: item.period,
              value: item.count,
              label: `${item.count} messages`,
            })) ?? []
          }
          color="#c8965a"
          height={250}
        />

        {/* Active Users */}
        <TimeSeriesChart
          title="Active Users"
          data={
            historicalStats?.activeUsers.map((item) => ({
              period: item.period,
              value: item.count,
              label: `${item.count} users`,
            })) ?? []
          }
          color="#a3753f"
          height={250}
        />

        {/* Token Usage */}
        <TimeSeriesChart
          title="Token Usage"
          data={
            historicalStats?.tokenUsage.map((item) => ({
              period: item.period,
              value: item.total,
              label: `${item.total.toLocaleString()} tokens`,
            })) ?? []
          }
          color="#8f9d59"
          height={250}
        />

        {/* Message Type Distribution */}
        <PieChart
          title="Message Distribution"
          data={
            historicalStats
              ? [
                  {
                    label: "User Messages",
                    value: historicalStats.messagesPerPeriod.reduce(
                      (sum, item) => sum + item.userMessages,
                      0,
                    ),
                    color: "#c8965a",
                  },
                  {
                    label: "Assistant Messages",
                    value: historicalStats.messagesPerPeriod.reduce(
                      (sum, item) => sum + item.assistantMessages,
                      0,
                    ),
                    color: "#a3753f",
                  },
                ]
              : []
          }
          size={180}
        />
      </div>

      {/* Moderation Insights */}
      {historicalStats &&
        historicalStats.moderationFlags.some((item) => item.count > 0) && (
          <TimeSeriesChart
            title="Moderation Flags"
            data={historicalStats.moderationFlags.map((item) => ({
              period: item.period,
              value: item.count,
              label: `${item.count} flags`,
            }))}
            color="#ef4444"
            height={200}
          />
        )}
    </div>
  );
}
