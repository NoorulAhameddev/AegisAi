# SNS Topic for CloudWatch Alarms

resource "aws_sns_topic" "alarms" {
  name = "${local.name_prefix}-alarms"
  
  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Optional: SMS notifications for critical alarms
# resource "aws_sns_topic_subscription" "alarms_sms" {
#   topic_arn = aws_sns_topic.alarms.arn
#   protocol  = "sms"
#   endpoint  = var.alarm_phone # Add variable
# }

# CloudWatch Metric Alarm for Queue Depth
resource "aws_cloudwatch_metric_alarm" "chat_queue_depth" {
  alarm_name          = "${local.name_prefix}-chat-queue-high-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "QueueDepth"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Average"
  threshold           = "500"
  alarm_description   = "Chat queue depth is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    QueueName = "chatQueue"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rag_queue_depth" {
  alarm_name          = "${local.name_prefix}-rag-queue-high-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "QueueDepth"
  namespace           = "AegisAI"
  period              = "600"
  statistic           = "Average"
  threshold           = "200"
  alarm_description   = "RAG queue depth is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    QueueName = "ragQueue"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  alarm_name          = "${local.name_prefix}-dlq-has-failed-jobs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "QueueDepth"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "Dead-letter queue has failed jobs requiring attention"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    QueueName = "dlqQueue"
  }
  
  tags = local.common_tags
}

# Worker Health Alarms
resource "aws_cloudwatch_metric_alarm" "worker_processing_latency" {
  alarm_name          = "${local.name_prefix}-worker-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "JobProcessingLatency"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "p95"
  threshold           = "30000" # 30 seconds in milliseconds
  alarm_description   = "Worker job processing latency P95 is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    WorkerType = "chat"
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "worker_error_rate" {
  alarm_name          = "${local.name_prefix}-worker-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "JobFailureRate"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.05" # 5% error rate
  alarm_description   = "Worker job failure rate is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    WorkerType = "chat"
  }
  
  tags = local.common_tags
}

# API Performance Alarms
resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${local.name_prefix}-api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5xxErrorRate"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.05" # 5% error rate
  alarm_description   = "API 5xx error rate is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${local.name_prefix}-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "RequestLatency"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "p95"
  threshold           = "2000" # 2 seconds in milliseconds
  alarm_description   = "API request latency P95 is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  tags = local.common_tags
}

# External Service Circuit Breaker Alarms
resource "aws_cloudwatch_metric_alarm" "openai_circuit_open" {
  alarm_name          = "${local.name_prefix}-openai-circuit-breaker-open"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CircuitBreakerOpen"
  namespace           = "AegisAI"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "OpenAI circuit breaker is open"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    Service = "OpenAI"
  }
  
  tags = local.common_tags
}

# Token Budget Alarms
resource "aws_cloudwatch_metric_alarm" "token_budget_exhausted" {
  alarm_name          = "${local.name_prefix}-token-budget-exhausted"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "TokenBudgetExhausted"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10" # More than 10 users hitting budget limit
  alarm_description   = "Multiple users exhausting token budgets"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  tags = local.common_tags
}

# Database Connection Pool Alarm
resource "aws_cloudwatch_metric_alarm" "db_pool_saturation" {
  alarm_name          = "${local.name_prefix}-db-pool-saturation"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DBPoolUsage"
  namespace           = "AegisAI"
  period              = "300"
  statistic           = "Average"
  threshold           = "0.9" # 90% pool usage
  alarm_description   = "Database connection pool usage is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  tags = local.common_tags
}

# ECS Container Insights Alarms
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${local.name_prefix}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  alarm_name          = "${local.name_prefix}-ecs-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS memory utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.api.name
  }
  
  tags = local.common_tags
}
