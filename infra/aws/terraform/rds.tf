# RDS PostgreSQL with Multi-AZ and Read Replicas
# Production-ready configuration with pgvector support

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
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
    Name = "${local.name_prefix}-rds-sg"
  })
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# DB Parameter Group with optimized settings
resource "aws_db_parameter_group" "postgres16" {
  name   = "${local.name_prefix}-postgres16-params"
  family = "postgres16"
  
  # Connection pooling parameters
  parameter {
    name  = "max_connections"
    value = "200" # Supports 40 connections per instance x 5 instances
  }
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,pgvector"
  }
  
  # Performance tuning
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of RAM
  }
  
  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory/2048}" # 50% of RAM
  }
  
  parameter {
    name  = "maintenance_work_mem"
    value = "2097152" # 2 GB in KB
  }
  
  parameter {
    name  = "work_mem"
    value = "16384" # 16 MB in KB
  }
  
  # Query timeout
  parameter {
    name  = "statement_timeout"
    value = "60000" # 60 seconds in milliseconds
  }
  
  parameter {
    name  = "idle_in_transaction_session_timeout"
    value = "300000" # 5 minutes
  }
  
  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries > 1s
  }
  
  parameter {
    name  = "log_connections"
    value = "1"
  }
  
  parameter {
    name  = "log_disconnections"
    value = "1"
  }
  
  tags = local.common_tags
}

# Primary RDS Instance (Multi-AZ)
resource "aws_db_instance" "postgres" {
  identifier     = "${local.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = "16.1"
  
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  
  # Multi-AZ for high availability
  multi_az = true
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  
  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.postgres16.name
  
  # Backup configuration
  backup_retention_period   = var.db_backup_retention_days
  backup_window             = "03:00-04:00" # 3-4 AM UTC
  maintenance_window        = "mon:04:00-mon:05:00"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  
  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${local.name_prefix}-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Allow major version upgrades
  allow_major_version_upgrade = false
  auto_minor_version_upgrade  = true
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres-primary"
  })
}

# Read Replica 1
resource "aws_db_instance" "postgres_replica_1" {
  identifier     = "${local.name_prefix}-postgres-replica-1"
  replicate_source_db = aws_db_instance.postgres.identifier
  
  instance_class    = var.db_instance_class
  publicly_accessible = false
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Auto minor version upgrades
  auto_minor_version_upgrade = true
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres-replica-1"
    Role = "ReadReplica"
  })
}

# Read Replica 2
resource "aws_db_instance" "postgres_replica_2" {
  identifier     = "${local.name_prefix}-postgres-replica-2"
  replicate_source_db = aws_db_instance.postgres.identifier
  
  instance_class    = var.db_instance_class
  publicly_accessible = false
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Auto minor version upgrades
  auto_minor_version_upgrade = true
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres-replica-2"
    Role = "ReadReplica"
  })
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.name_prefix}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.name_prefix}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "180" # 90% of max_connections (200)
  alarm_description   = "RDS connection count is too high"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${local.name_prefix}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10 GB in bytes
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }
  
  tags = local.common_tags
}
