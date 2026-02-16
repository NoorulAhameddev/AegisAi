# Application Secrets stored in AWS Secrets Manager

# Application secrets (JWT, encryption keys, etc.)
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}-app-secrets"
  description             = "Application secrets for Aegis AI"
  recovery_window_in_days = 7
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  
  secret_string = jsonencode({
    JWT_SECRET           = random_password.jwt_secret.result
    JWT_REFRESH_SECRET   = random_password.jwt_refresh_secret.result
    OPENROUTER_API_KEY   = "" # Set manually or via terraform variable
    GOOGLE_CLIENT_ID     = "" # Set manually
    GOOGLE_CLIENT_SECRET = "" # Set manually
    GITHUB_CLIENT_ID     = "" # Set manually
    GITHUB_CLIENT_SECRET = "" # Set manually
    SENTRY_DSN          = "" # Set manually (optional)
  })
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = true
}

# Encryption key for data at rest
resource "aws_secretsmanager_secret" "encryption_key" {
  name                    = "${local.name_prefix}-encryption-key"
  description             = "AES-256 encryption key for sensitive data"
  recovery_window_in_days = 7
  
  tags = local.common_tags
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false # Must be exactly 32 bytes for AES-256
  upper   = true
  lower   = true
  numeric = true
}

resource "aws_secretsmanager_secret_version" "encryption_key" {
  secret_id     = aws_secretsmanager_secret.encryption_key.id
  secret_string = random_password.encryption_key.result
}

# IAM policy for ECS tasks to read secrets
resource "aws_iam_policy" "secrets_access" {
  name        = "${local.name_prefix}-secrets-access"
  description = "Allow ECS tasks to read secrets from Secrets Manager"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.redis_auth_token.arn,
          aws_secretsmanager_secret.app_secrets.arn,
          aws_secretsmanager_secret.encryption_key.arn
        ]
      }
    ]
  })
  
  tags = local.common_tags
}
