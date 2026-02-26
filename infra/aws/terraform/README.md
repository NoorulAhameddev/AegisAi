# Aegis AI AWS Infrastructure

This directory contains Terraform configurations for deploying Aegis AI to AWS with production-ready infrastructure.

## Architecture Overview

- **VPC**: Multi-AZ setup with public and private subnets across 3 availability zones
- **RDS PostgreSQL 16**: Multi-AZ primary with 2 read replicas, pgvector extension
- **ElastiCache Redis 7**: 3-node cluster with automatic failover
- **ECS Fargate**: Serverless containers for API and workers
- **Application Load Balancer**: HTTPS termination with health checks
- **S3**: Backups bucket (90-day retention) and uploads bucket (versioned)
- **CloudWatch**: Comprehensive metrics, logs, alarms, and dashboards
- **Secrets Manager**: Encrypted storage for credentials and API keys

## Prerequisites

1. **AWS CLI** installed and configured:

   ```bash
   aws configure
   ```

2. **Terraform** >= 1.6.0 installed:

   ```bash
   terraform version
   ```

3. **Docker** for building images:

   ```bash
   docker --version
   ```

4. **ACM Certificate** for HTTPS (create manually):
   ```bash
   aws acm request-certificate \
     --domain-name your-domain.com \
     --validation-method DNS \
     --region us-east-1
   ```

## Initial Setup

### 1. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

- **alarm_email**: Email for CloudWatch alarm notifications
- **aws_region**: AWS region for deployment
- Resource sizes based on expected load

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Plan

```bash
terraform plan -out=tfplan
```

Review the resources to be created (~50+ resources).

### 4. Apply Infrastructure

```bash
terraform apply tfplan
```

This will create:

- VPC with networking (5-10 minutes)
- RDS PostgreSQL with replicas (10-15 minutes)
- ElastiCache Redis cluster (10-15 minutes)
- ECS cluster and task definitions
- ALB and security groups
- S3 buckets
- CloudWatch alarms and dashboards

**Total deployment time**: ~20-30 minutes

## Post-Deployment Configuration

### 1. Enable pgvector Extension

Connect to RDS and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 2. Update ACM Certificate in ALB

After ACM certificate is validated:

```bash
terraform apply -var="acm_certificate_arn=arn:aws:acm:region:account:certificate/ID"
```

### 3. Push Docker Image to ECR

Get ECR login:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ECR_URL
```

Build and push:

```bash
docker build -t aegis-ai .
docker tag aegis-ai:latest ECR_URL/aegis-ai-production-app:latest
docker push ECR_URL/aegis-ai-production-app:latest
```

Get ECR URL from Terraform outputs:

```bash
terraform output ecr_repository_url
```

### 4. Run Database Migrations

From ECS task or bastion host:

```bash
npx prisma migrate deploy
```

### 5. Update Application Secrets

Manually set API keys in Secrets Manager:

```bash
aws secretsmanager update-secret \
  --secret-id aegis-ai-production-app-secrets \
  --secret-string '{"OPENROUTER_API_KEY":"your-key-here",...}'
```

### 6. Configure DNS

Point your domain to ALB:

```bash
terraform output alb_dns_name
```

Create CNAME record: `your-domain.com` → `ALB_DNS_NAME`

## Accessing Resources

### CloudWatch Dashboard

```bash
aws cloudwatch get-dashboard \
  --dashboard-name aegis-ai-production-dashboard \
  --region us-east-1
```

Or visit: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:

### Application Logs

View logs in CloudWatch Logs Insights:

```bash
aws logs tail /ecs/aegis-ai-production --follow
```

### Database Connection

Get connection string from Secrets Manager:

```bash
aws secretsmanager get-secret-value \
  --secret-id aegis-ai-production-db-password \
  --query SecretString \
  --output text
```

Connect via psql:

```bash
psql "postgresql://aegis_admin:PASSWORD@ENDPOINT:5432/aegisai"
```

### Redis Connection

Get auth token:

```bash
aws secretsmanager get-secret-value \
  --secret-id aegis-ai-production-redis-auth-token \
  --query SecretString \
  --output text
```

Connect via redis-cli:

```bash
redis-cli -h ENDPOINT --tls --askpass
```

## Monitoring

### View Alarms

```bash
aws cloudwatch describe-alarms --state-value ALARM
```

### Test Alarm Notifications

Trigger test alarm:

```bash
aws cloudwatch set-alarm-state \
  --alarm-name aegis-ai-production-chat-queue-high-depth \
  --state-value ALARM \
  --state-reason "Testing alarm"
```

### Query Logs

Error logs (last hour):

```bash
aws logs filter-log-events \
  --log-group-name /ecs/aegis-ai-production \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 3600))000
```

## Scaling

### Manual Scaling

Scale API tasks:

```bash
aws ecs update-service \
  --cluster aegis-ai-production-cluster \
  --service aegis-ai-production-api \
  --desired-count 4
```

Scale chat workers:

```bash
aws ecs update-service \
  --cluster aegis-ai-production-cluster \
  --service aegis-ai-production-worker \
  --desired-count 5
```

### Auto-scaling

Workers auto-scale based on queue depth (CloudWatch metric).
Configure thresholds in `variables.tf`:

- `autoscaling_target_queue_depth`: Target queue depth (default: 50)
- `autoscaling_max_capacity`: Maximum worker tasks (default: 10)

## Backup and Recovery

### Database Backups

Automated daily backups (7-day retention).
Manual snapshot:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier aegis-ai-production-postgres \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)
```

### S3 Backups

Automated lifecycle:

- Day 0-30: Standard storage
- Day 30-90: Glacier storage
- Day 90+: Deleted

List backups:

```bash
aws s3 ls s3://aegis-ai-production-backups/
```

### Restore Database

From snapshot:

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aegis-ai-restored \
  --db-snapshot-identifier snapshot-id
```

## Cost Optimization

### Estimated Monthly Costs (us-east-1)

- **RDS** (db.t4g.large x3): ~$240/month
- **ElastiCache** (cache.t4g.medium x3): ~$150/month
- **ECS Fargate** (2 API + 5 workers): ~$200/month
- **ALB**: ~$20/month
- **Data Transfer**: ~$50-100/month
- **CloudWatch**: ~$30/month
- **S3 Storage**: ~$10-50/month

**Total**: ~$700-800/month

### Cost Reduction Strategies

1. **Use Fargate Spot** for workers (70% savings):

   ```hcl
   capacity_provider = "FARGATE_SPOT"
   ```

2. **Reduce RDS replica count** (dev/staging):

   ```hcl
   # Comment out read replicas in rds.tf
   ```

3. **Use smaller instance sizes** (staging):

   ```hcl
   db_instance_class = "db.t4g.micro"
   redis_node_type = "cache.t4g.micro"
   ```

4. **Enable S3 Intelligent-Tiering**:
   ```hcl
   storage_class = "INTELLIGENT_TIERING"
   ```

## Troubleshooting

### ECS Task Won't Start

Check logs:

```bash
aws ecs describe-tasks \
  --cluster aegis-ai-production-cluster \
  --tasks TASK_ID
```

Common issues:

- Secrets Manager permissions
- ECR image not found
- Database connection failed

### Database Connection Pool Exhausted

Increase pool size:

```env
DB_POOL_SIZE=60  # In task definition
```

Or scale read replicas:

```bash
terraform apply -var="enable_read_replicas=true"
```

### Redis Memory Pressure

Check evictions:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name Evictions \
  --dimensions Name=ReplicationGroupId,Value=aegis-ai-production-redis \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

Upgrade node type if needed.

### High ALB Latency

Check target health:

```bash
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN
```

Scale API tasks if unhealthy targets exist.

## Disaster Recovery

### RTO/RPO Targets

- **RTO** (Recovery Time Objective): 2 hours
- **RPO** (Recovery Point Objective): 24 hours

### Recovery Procedures

See [../../docs/DISASTER_RECOVERY.md](../../docs/DISASTER_RECOVERY.md) for detailed procedures.

Quick recovery:

1. Restore RDS from latest automated snapshot (~30 minutes)
2. Restore Redis from S3 backup RDB (~10 minutes)
3. Re-ingest vectors from S3 backup (~1-4 hours)
4. Update ECS services to use restored resources

## Cleanup

### Destroy Infrastructure

**WARNING**: This deletes all data permanently.

```bash
# Disable deletion protection first
aws rds modify-db-instance \
  --db-instance-identifier aegis-ai-production-postgres \
  --no-deletion-protection

aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn ALB_ARN \
  --attributes Key=deletion_protection.enabled,Value=false

# Then destroy
terraform destroy
```

Confirm deletion of:

- All ECS tasks and services
- RDS instances (including replicas)
- ElastiCache cluster
- S3 buckets (will fail if not empty - delete manually)
- CloudWatch alarms and dashboards

## Security Best Practices

1. **Enable MFA** for AWS root account
2. **Use IAM roles** instead of access keys where possible
3. **Enable CloudTrail** for audit logging
4. **Rotate secrets** regularly (90 days)
5. **Enable GuardDuty** for threat detection
6. **Use AWS Config** for compliance monitoring
7. **Enable VPC Flow Logs** (already configured)
8. **Review IAM permissions** quarterly

## Support

For issues or questions:

- **Infrastructure**: Review Terraform documentation
- **Application**: See main [README.md](../../../README.md)
- **AWS Support**: https://console.aws.amazon.com/support/

## License

See [LICENSE](../../../LICENSE) in repository root.
