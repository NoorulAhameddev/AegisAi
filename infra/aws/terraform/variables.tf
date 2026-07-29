# Aegis AI - AWS Infrastructure Variables
# Production-ready Terraform configuration for ECS deployment

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production"
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "aegis-ai"
}

variable "frontend_url" {
  description = "Frontend URL for WebSocket CORS"
  type        = string
  default     = "http://localhost:3000"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.large" # 2 vCPU, 8 GB RAM
}

variable "db_allocated_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum database storage for autoscaling in GB"
  type        = number
  default     = 500
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "aegisai"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "aegis_admin"
  sensitive   = true
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.medium" # 2 vCPU, 3.09 GB RAM
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters (nodes) for Redis replication"
  type        = number
  default     = 3 # 1 primary + 2 replicas
}

# ECS Configuration
variable "ecs_api_task_count" {
  description = "Desired count of API tasks"
  type        = number
  default     = 2
}

variable "ecs_api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 2048 # 2 vCPU
}

variable "ecs_api_memory" {
  description = "Memory for API task in MB"
  type        = number
  default     = 4096 # 4 GB
}

variable "ecs_worker_task_count" {
  description = "Desired count of chat worker tasks"
  type        = number
  default     = 3
}

variable "ecs_worker_cpu" {
  description = "CPU units for worker task"
  type        = number
  default     = 1024 # 1 vCPU
}

variable "ecs_worker_memory" {
  description = "Memory for worker task in MB"
  type        = number
  default     = 2048 # 2 GB
}

variable "ecs_rag_worker_task_count" {
  description = "Desired count of RAG worker tasks"
  type        = number
  default     = 2
}

variable "ecs_rag_worker_cpu" {
  description = "CPU units for RAG worker task"
  type        = number
  default     = 2048 # 2 vCPU
}

variable "ecs_rag_worker_memory" {
  description = "Memory for RAG worker task in MB"
  type        = number
  default     = 4096 # 4 GB (higher memory for embeddings)
}

variable "ecs_websocket_worker_task_count" {
  description = "Desired count of WebSocket worker tasks"
  type        = number
  default     = 1
}

variable "ecs_websocket_worker_cpu" {
  description = "CPU units for WebSocket worker task"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "ecs_websocket_worker_memory" {
  description = "Memory for WebSocket worker task in MB"
  type        = number
  default     = 1024 # 1 GB
}

# Auto-scaling Configuration
variable "autoscaling_min_capacity" {
  description = "Minimum number of worker tasks"
  type        = number
  default     = 2
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of worker tasks"
  type        = number
  default     = 10
}

variable "autoscaling_target_queue_depth" {
  description = "Target queue depth for auto-scaling workers"
  type        = number
  default     = 50
}

# S3 Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups in S3"
  type        = number
  default     = 90
}

variable "backup_glacier_transition_days" {
  description = "Number of days before transitioning backups to Glacier"
  type        = number
  default     = 30
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Aegis AI"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# Monitoring
variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for deployment notifications (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
}
