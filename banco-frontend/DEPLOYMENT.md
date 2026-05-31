# Deployment Guide - BancoDDD Enterprise Frontend

## Overview

This document describes the deployment process for the BancoDDD banking frontend application, including local development, staging, and production environments.

## Prerequisites

### Required Tools

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 20+
- **npm** 10+
- **Git** 2.30+

### Required Access

- Docker registry access
- Server SSH access
- CI/CD platform access
- Domain management access

## Environment Configuration

### Environment Variables

Create `.env.production` file:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.bancoddd.com/v1
NEXT_PUBLIC_APP_NAME=BancoDDD
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_CSRF_PROTECTION=true
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true
NEXT_PUBLIC_ENABLE_OFFLINE_SUPPORT=true
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

## Local Development

### Setup

```bash
# Clone repository
git clone https://github.com/bancoddd/frontend.git
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
npm run test:unit   # Run unit tests
npm run test:e2e     # Run E2E tests
```

## Docker Deployment

### Build Docker Image

```bash
# Build image
docker build -t banco-frontend:prod .

# Tag image
docker tag banco-frontend:prod registry.bancoddd.com/banco-frontend:latest

# Push to registry
docker push registry.bancoddd.com/banco-frontend:latest
```

### Run with Docker Compose

```bash
# Create network
docker network create banco-network

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Production Deployment

### Deployment Strategy

The application uses a blue-green deployment strategy:

1. **Blue Environment** - Current production
2. **Green Environment** - New version
3. **Switch** - Traffic routing
4. **Rollback** - If needed

### Deployment Steps

#### 1. Prepare Deployment

```bash
# Checkout production branch
git checkout main

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Run tests
npm run test:unit
npm run test:e2e

# Build application
npm run build
```

#### 2. Build Docker Image

```bash
# Build with production tag
docker build -t banco-frontend:$(git rev-parse --short HEAD) .

# Tag as latest
docker tag banco-frontend:$(git rev-parse --short HEAD) banco-frontend:latest

# Push to registry
docker push banco-frontend:$(git rev-parse --short HEAD)
docker push banco-frontend:latest
```

#### 3. Deploy to Production

```bash
# SSH to production server
ssh user@production-server

# Pull latest image
docker pull banco-frontend:latest

# Stop old containers
docker-compose -f docker-compose.prod.yml down

# Start new containers
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl http://localhost/health
```

#### 4. Health Check

```bash
# Check health endpoint
curl https://api.bancoddd.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 12345,
  "environment": "production",
  "version": "1.0.0"
}
```

## CI/CD Pipeline

### GitHub Actions Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run test:unit
      - run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: registry.bancoddd.com
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - run: docker build -t registry.bancoddd.com/banco-frontend:${{ github.sha }} .
      - run: docker push registry.bancoddd.com/banco-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Production
        run: |
          ssh user@production-server << 'EOF'
            docker pull registry.bancoddd.com/banco-frontend:${{ github.sha }}
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d
          EOF
```

## Monitoring

### Health Checks

The application includes health check endpoints:

- `/health` - Application health
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Monitoring Tools

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Sentry** - Error tracking
- **New Relic** - APM

### Log Aggregation

Logs are aggregated using:

- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **CloudWatch** - AWS CloudWatch Logs
- **Loki** - Grafana Loki

## Rollback Procedure

### Manual Rollback

```bash
# SSH to production server
ssh user@production-server

# List previous images
docker images | grep banco-frontend

# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker run -d --name banco-frontend-rollback banco-frontend:previous-version

# Verify rollback
curl http://localhost/health
```

### Automated Rollback

The CI/CD pipeline includes automatic rollback on failure:

```yaml
- name: Rollback on Failure
  if: failure()
  run: |
    ssh user@production-server << 'EOF'
      docker-compose -f docker-compose.prod.yml down
      docker-compose -f docker-compose.prod.yml up -d --scale banco-frontend=0
      docker-compose -f docker-compose.prod.yml up -d
    EOF
```

## Scaling

### Horizontal Scaling

```bash
# Scale frontend service
docker-compose -f docker-compose.prod.yml up -d --scale banco-frontend=3
```

### Load Balancing

Nginx is configured for load balancing:

```nginx
upstream banco_frontend {
    server banco-frontend-1:3000;
    server banco-frontend-2:3000;
    server banco-frontend-3:3000;
    least_conn;
}
```

## Security Considerations

### SSL/TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name bancoddd.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Check build logs
docker-compose -f docker-compose.prod.yml logs banco-frontend

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache
```

#### Container Won't Start

```bash
# Check container logs
docker logs banco-frontend

# Check container status
docker ps -a | grep banco-frontend

# Restart container
docker restart banco-frontend
```

#### Health Check Fails

```bash
# Check health endpoint
curl http://localhost/health

# Check nginx logs
docker logs banco-proxy

# Check application logs
docker logs banco-frontend
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check memory usage
docker exec banco-frontend free -h

# Check CPU usage
docker exec banco-frontend top
```

## Maintenance

### Regular Maintenance Tasks

- **Daily**: Monitor logs and metrics
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Full system review

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Audit for vulnerabilities
npm audit fix

# Test after updates
npm run test:unit
npm run test:e2e
```

### Database Backups

```bash
# Backup database
docker exec banco-backend pg_dump -U user database > backup.sql

# Restore database
docker exec -i banco-backend psql -U user database < backup.sql
```

## Disaster Recovery

### Backup Strategy

- **Daily**: Automated backups
- **Weekly**: Full system backup
- **Monthly**: Offsite backup

### Recovery Procedure

1. Assess damage
2. Restore from backup
3. Verify data integrity
4. Restart services
5. Monitor for issues

## Support

### Contact Information

- **DevOps Team**: devops@bancoddd.com
- **Support Hotline**: +1-555-SUPPORT
- **Emergency**: emergency@bancoddd.com

### Documentation

- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
- [API Integration](./API_INTEGRATION.md)
- [Security Guide](./SECURITY_FRONTEND.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)

## Appendix

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Docker image built successfully
- [ ] Tests passing
- [ ] Health checks passing
- [ ] SSL/TLS configured
- [ ] Firewall rules applied
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Backup verified
- [ ] Rollback procedure tested

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial release |
| 1.1.0 | 2024-02-01 | Performance optimizations |
| 1.2.0 | 2024-03-01 | Security enhancements |
| 1.3.0 | 2024-04-01 | New features |
