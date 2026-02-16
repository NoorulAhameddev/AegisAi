# CloudWatch Dashboard Configuration
# JSON dashboard definition for comprehensive monitoring

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      # System Health Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average", label = "API CPU" }],
            ["...", { stat = "Average", label = "Worker CPU" }],
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "p95", label = "API Latency P95" }],
            ["AegisAI", "RequestLatency", { stat = "p95", label = "Request Latency P95" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "System Health"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # Queue Metrics Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AegisAI", "QueueDepth", { dimensionName = "QueueName", dimensionValue = "chatQueue", stat = "Average", label = "Chat Queue" }],
            ["...", { dimensionValue = "ragQueue", stat = "Average", label = "RAG Queue" }],
            ["...", { dimensionValue = "dlqQueue", stat = "Average", label = "DLQ" }],
            ["...", "QueueWaitTime", { dimensionName = "QueueName", dimensionValue = "chatQueue", stat = "Average", label = "Wait Time" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Queue Metrics"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # Database Metrics Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { dimensionName = "DBInstanceIdentifier", dimensionValue = aws_db_instance.postgres.id, stat = "Average", label = "Connections" }],
            ["...", "CPUUtilization", { stat = "Average", label = "CPU" }],
            ["...", "ReadLatency", { stat = "Average", label = "Read Latency" }],
            ["...", "WriteLatency", { stat = "Average", label = "Write Latency" }],
            ["AegisAI", "DBPoolUsage", { stat = "Average", label = "Pool Usage %" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Database Metrics"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # Worker Performance Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AegisAI", "JobProcessingLatency", { dimensionName = "WorkerType", dimensionValue = "chat", stat = "p50", label = "P50" }],
            ["...", { stat = "p95", label = "P95" }],
            ["...", { stat = "p99", label = "P99" }],
            ["...", "JobFailureRate", { stat = "Average", label = "Failure Rate" }],
            ["...", "JobRetryCount", { stat = "Sum", label = "Retries" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Worker Performance"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # AI Services Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AegisAI", "OpenAILatency", { stat = "p95", label = "OpenAI Latency P95" }],
            ["...", "TokenUsage", { stat = "Sum", label = "Tokens Used" }],
            ["...", "OpenAIRateLimitErrors", { stat = "Sum", label = "Rate Limit Errors" }],
            ["...", "CircuitBreakerOpen", { dimensionName = "Service", dimensionValue = "OpenAI", stat = "Maximum", label = "Circuit Open" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "AI Services"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # User Activity Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AegisAI", "ActiveUsers", { stat = "Sum", label = "Active Users" }],
            ["...", "MessagesPerMinute", { stat = "Sum", label = "Messages/Min" }],
            ["...", "RAGQueries", { stat = "Sum", label = "RAG Queries" }],
            ["...", "TokenBudgetExhausted", { stat = "Sum", label = "Budget Exhausted" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "User Activity"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # Redis Metrics Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { dimensionName = "ReplicationGroupId", dimensionValue = aws_elasticache_replication_group.redis.id, stat = "Average", label = "CPU" }],
            ["...", "DatabaseMemoryUsagePercentage", { stat = "Average", label = "Memory %" }],
            ["...", "Evictions", { stat = "Sum", label = "Evictions" }],
            ["...", "ReplicationLag", { stat = "Maximum", label = "Replication Lag" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Metrics"
          yAxis = {
            left = { min = 0 }
          }
        }
      },
      
      # Error Rates Row
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { dimensionName = "LoadBalancer", dimensionValue = aws_lb.main.arn_suffix, stat = "Sum", label = "5xx Errors" }],
            ["...", "HTTPCode_Target_4XX_Count", { stat = "Sum", label = "4xx Errors" }],
            ["AegisAI", "5xxErrorRate", { stat = "Average", label = "Error Rate %" }],
            ["...", "UnhandledExceptions", { stat = "Sum", label = "Exceptions" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Error Metrics"
          yAxis = {
            left = { min = 0 }
          }
        }
      }
    ]
  })
}

# Log Group for application logs (already created in ecs.tf, adding insights here)
resource "aws_cloudwatch_query_definition" "error_logs" {
  name = "${local.name_prefix}-error-logs"
  
  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, @message, level, error, userId, requestId
    | filter level = "error"
    | sort @timestamp desc
    | limit 100
  QUERY
}

resource "aws_cloudwatch_query_definition" "slow_requests" {
  name = "${local.name_prefix}-slow-requests"
  
  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, route, duration, userId, requestId
    | filter duration > 2000
    | sort duration desc
    | limit 50
  QUERY
}

resource "aws_cloudwatch_query_definition" "worker_failures" {
  name = "${local.name_prefix}-worker-failures"
  
  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, jobId, error, attemptsMade, maxAttempts
    | filter @message like /Worker job failed/
    | sort @timestamp desc
    | limit 100
  QUERY
}

resource "aws_cloudwatch_query_definition" "security_events" {
  name = "${local.name_prefix}-security-events"
  
  log_group_names = [
    aws_cloudwatch_log_group.app.name
  ]
  
  query_string = <<-QUERY
    fields @timestamp, @message, userId, ipAddress, reason
    | filter category = "security"
    | sort @timestamp desc
    | limit 100
  QUERY
}
