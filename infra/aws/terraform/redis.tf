# ElastiCache Redis Cluster with automatic failover
# Production-ready configuration with replication

# Security Group for Redis
resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet-group"
  })
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "${local.name_prefix}-redis7-params"
  family = "redis7"
  
  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru" # Evict least recently used keys
  }
  
  # Persistence (for data durability)
  parameter {
    name  = "appendonly"
    value = "yes"
  }
  
  parameter {
    name  = "appendfsync"
    value = "everysec" # Balance between performance and durability
  }
  
  # Timeout configuration
  parameter {
    name  = "timeout"
    value = "300" # 5 minutes
  }
  
  tags = local.common_tags
}

# Redis Replication Group (cluster mode disabled for simplicity)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name_prefix}-redis"
  replication_group_description = "Redis cluster for Aegis AI queue and caching"
  
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_clusters
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  
  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  # High availability
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00" # 3-5 AM UTC
  maintenance_window      = "mon:05:00-mon:07:00"
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled        = true
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  # Notification
  notification_topic_arn = aws_sns_topic.alarms.arn
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-cluster"
  })
}

# Redis auth token stored in Secrets Manager
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false # Redis auth token doesn't support special chars
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${local.name_prefix}-redis-auth-token"
  description             = "Redis AUTH token"
  recovery_window_in_days = 7
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

# Update Redis replication group with auth token
resource "aws_elasticache_replication_group" "redis_with_auth" {
  depends_on = [aws_elasticache_replication_group.redis]
  
  replication_group_id = aws_elasticache_replication_group.redis.id
  auth_token           = random_password.redis_auth_token.result
  
  lifecycle {
    ignore_changes = [auth_token]
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Redis CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.name_prefix}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Redis memory usage is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${local.name_prefix}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Redis is evicting keys (memory pressure)"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  alarm_name          = "${local.name_prefix}-redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "10" # 10 seconds
  alarm_description   = "Redis replication lag is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }
  
  tags = local.common_tags
}
