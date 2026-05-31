# Troubleshooting Guide - BancoDDD Enterprise

## Overview

This guide provides solutions to common issues encountered when running the BancoDDD full stack application.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Authentication Issues](#authentication-issues)
- [API Integration Issues](#api-integration-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)
- [Deployment Issues](#deployment-issues)

## Installation Issues

### Node.js Version Incompatible

**Problem**: Error about Node.js version not being compatible

**Solution**:
```bash
# Check current Node.js version
node --version

# Install required version (20+)
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

### npm Install Fails

**Problem**: `npm install` fails with errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules
rm -rf package-lock.json

# Reinstall dependencies
npm install --legacy-peer-deps
```

### Docker Not Running

**Problem**: Docker commands fail with "docker daemon not running"

**Solution**:
```bash
# Windows: Start Docker Desktop from Start menu
# macOS: Start Docker Desktop from Applications
# Linux: sudo systemctl start docker

# Verify Docker is running
docker --version
docker ps
```

## Database Issues

### MySQL Connection Refused

**Problem**: Cannot connect to MySQL database

**Solution**:
```bash
# Check if MySQL container is running
docker ps | grep banco-mysql

# Start MySQL container
docker start banco-mysql

# Check MySQL logs
docker logs banco-mysql

# Test connection
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd
```

### Database Not Created

**Problem**: Database does not exist

**Solution**:
```bash
# Connect to MySQL
docker exec -it banco-mysql mysql -u root -prootpassword

# Create database
CREATE DATABASE banco_ddd;

# Create user
CREATE USER 'banco_user'@'%' IDENTIFIED BY 'banco_password';
GRANT ALL PRIVILEGES ON banco_ddd.* TO 'banco_user'@'%';
FLUSH PRIVILEGES;

EXIT;
```

### Port 3306 Already in Use

**Problem**: MySQL port already in use

**Solution**:
```bash
# Windows: Find process using port
netstat -ano | findstr :3306
taskkill /PID <PID> /F

# macOS/Linux: Find process using port
lsof -i :3306
kill -9 <PID>

# Or change MySQL port in docker-compose.yml
ports:
  - "3307:3306"
```

### Database Schema Not Created

**Problem**: Tables not created in database

**Solution**:
```bash
# Backend should auto-create tables on startup
# Check backend logs for errors

# Manually run schema if needed
# Execute SQL scripts from backend resources
docker exec -i banco-mysql mysql -u banco_user -pbanco_password banco_ddd < schema.sql
```

## Backend Issues

### Backend Won't Start

**Problem**: Spring Boot application fails to start

**Solution**:
```bash
# Check backend logs
# Look for error messages in console output

# Common issues:
# 1. Database connection - verify database is running
# 2. Port conflict - change SERVER_PORT in application.yml
# 3. Missing dependencies - run ./mvnw clean install

# Try clean build
./mvnw clean package
./mvnw spring-boot:run
```

### Backend Health Check Fails

**Problem**: `/actuator/health` returns error

**Solution**:
```bash
# Check if backend is running
curl http://localhost:8080/actuator/health

# Check backend logs for errors
# Common causes:
# 1. Database connection issue
# 2. Missing configuration
# 3. Dependency injection failure

# Verify configuration
cat src/main/resources/application.yml
```

### CORS Errors

**Problem**: Frontend gets CORS errors when calling backend

**Solution**:
```yaml
# Add CORS configuration in backend
# src/main/resources/application.yml

spring:
  web:
    cors:
      allowed-origins: http://localhost:3000,http://localhost:80
      allowed-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
      allowed-headers: "*"
      allow-credentials: true
```

### Backend Port Already in Use

**Problem**: Port 8080 already in use

**Solution**:
```bash
# Windows: Find process using port
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux: Find process using port
lsof -i :8080
kill -9 <PID>

# Or change backend port
# Edit application.yml
server:
  port: 8081
```

## Frontend Issues

### Frontend Won't Start

**Problem**: `npm run dev` fails

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Check for port conflicts
# Windows: netstat -ano | findstr :3000
# macOS/Linux: lsof -i :3000

# Try different port
npm run dev -- -p 3001
```

### Build Errors

**Problem**: `npm run build` fails

**Solution**:
```bash
# Run type check
npm run type-check

# Fix TypeScript errors

# Run lint
npm run lint

# Fix linting errors

# Clear cache and rebuild
rm -rf .next
npm run build
```

### Environment Variables Not Working

**Problem**: Environment variables not loaded

**Solution**:
```bash
# Verify .env.local exists
ls -la .env.local

# Check variable names match
# NEXT_PUBLIC_* variables must be prefixed

# Restart dev server after changing .env
npm run dev
```

### Hot Reload Not Working

**Problem**: Changes not reflected in browser

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Check browser console for errors
# Disable browser cache temporarily
```

## Authentication Issues

### Login Fails

**Problem**: Cannot login with credentials

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8080/actuator/health

# Check backend logs for authentication errors

# Verify user exists in database
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd
SELECT * FROM usuarios WHERE correo_electronico = 'your@email.com';

# Reset password if needed
UPDATE usuarios SET contrasena = 'new_hash' WHERE id_usuario = 1;
```

### Token Refresh Fails

**Problem**: Automatic token refresh not working

**Solution**:
```bash
# Check refresh token storage
# Open browser DevTools > Application > Local Storage
# Verify refresh_token exists

# Check refresh endpoint
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your_token"}'

# Verify token expiration
# Check JWT expiration time in token payload
```

### Session Expired

**Problem**: User logged out unexpectedly

**Solution**:
```bash
# Check token expiration time
# Backend: JWT_EXPIRATION in application.yml
# Default: 1 hour (3600000 ms)

# Increase expiration if needed
JWT_EXPIRATION: 7200000  # 2 hours

# Check session timeout in frontend
# NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES in .env
```

### 401 Unauthorized

**Problem**: API calls return 401 error

**Solution**:
```bash
# Check if token exists in storage
# Browser DevTools > Application > Local Storage

# Verify token is not expired
# Decode JWT and check exp timestamp

# Check token format
# Should be: Bearer <token>

# Verify backend authentication configuration
```

## API Integration Issues

### API Connection Failed

**Problem**: Frontend cannot connect to backend API

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8080/actuator/health

# Check API URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Test API endpoint directly
curl http://localhost:8080/api/v1/accounts/dashboard

# Check network tab in browser DevTools
# Look for failed requests and error messages
```

### API Returns 404

**Problem**: API endpoint returns 404 Not Found

**Solution**:
```bash
# Verify endpoint path is correct
# Check backend controller mappings

# Check API version
# Should be /api/v1/ not /api/

# Verify backend logs
# Look for mapping registration errors
```

### API Returns 500

**Problem**: API endpoint returns 500 Internal Server Error

**Solution**:
```bash
# Check backend logs for stack trace
# Look for exception messages

# Common causes:
# 1. Database query error
# 2. Null pointer exception
# 3. Validation error

# Check database connection
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd
```

### Slow API Response

**Problem**: API calls are slow

**Solution**:
```bash
# Check database performance
docker exec banco-mysql mysql -u banco_user -pbanco_password banco_ddd
SHOW PROCESSLIST;

# Add indexes to database
# Optimize slow queries

# Check network latency
ping localhost

# Enable backend caching
# Configure Spring Cache
```

## Docker Issues

### Docker Build Fails

**Problem**: `docker-compose build` fails

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Check Dockerfile syntax
# Verify base image exists

# Check disk space
df -h

# Try building without cache
docker-compose build --no-cache
```

### Docker Container Won't Start

**Problem**: Container exits immediately

**Solution**:
```bash
# Check container logs
docker logs <container-name>

# Check container status
docker ps -a

# Common issues:
# 1. Port conflict
# 2. Volume mount issue
# 3. Environment variable issue

# Try running in interactive mode
docker run -it <image-name> bash
```

### Docker Network Issues

**Problem**: Containers cannot communicate

**Solution**:
```bash
# Check network configuration
docker network ls
docker network inspect banco-network

# Verify containers are on same network
docker inspect banco-frontend | grep NetworkMode
docker inspect banco-backend | grep NetworkMode

# Recreate network
docker network rm banco-network
docker-compose up -d
```

### Docker Volume Issues

**Problem**: Volume mounts not working

**Solution**:
```bash
# Check volume configuration
docker volume ls
docker volume inspect mysql_data

# Verify file permissions
ls -la ./docker/mysql/init

# Recreate volume
docker-compose down -v
docker-compose up -d
```

## Performance Issues

### Slow Page Load

**Problem**: Frontend pages load slowly

**Solution**:
```bash
# Check bundle size
npm run build
# Analyze .next/static/chunks/

# Enable code splitting
# Use dynamic imports for large components

# Optimize images
# Use next/image component

# Enable caching
# Configure CDN
```

### High Memory Usage

**Problem**: Application uses too much memory

**Solution**:
```bash
# Check Docker resource usage
docker stats

# Increase memory limits
# In docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G

# Optimize React components
# Use React.memo
# Use useMemo/useCallback
```

### Database Slow Queries

**Problem**: Database queries are slow

**Solution**:
```bash
# Enable slow query log
# In MySQL configuration:
slow_query_log = 1
long_query_time = 2

# Analyze slow queries
docker exec banco-mysql mysql -u banco_user -pbanco_password banco_ddd
SHOW VARIABLES LIKE 'slow_query_log%';

# Add indexes
CREATE INDEX idx_account_number ON cuentas(numero_cuenta);

# Optimize queries
# Use EXPLAIN to analyze query plan
```

## Security Issues

### CORS Errors

**Problem**: Browser blocks API calls due to CORS

**Solution**:
```yaml
# Configure CORS in backend
# src/main/resources/application.yml

spring:
  web:
    cors:
      allowed-origins: http://localhost:3000
      allowed-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
      allowed-headers: "*"
      allow-credentials: true
```

### CSRF Errors

**Problem**: CSRF token validation fails

**Solution**:
```bash
# Disable CSRF for development
# In backend SecurityConfig:
.csrf().disable()

# Or configure CSRF properly
# Include CSRF token in requests
```

### SSL/TLS Errors

**Problem**: HTTPS connection fails

**Solution**:
```bash
# For development, use HTTP
# Set NEXT_PUBLIC_API_URL to http://

# For production, configure SSL certificates
# Use Let's Encrypt or self-signed certificates

# Configure Nginx with SSL
# Add SSL certificate paths to nginx.conf
```

## Deployment Issues

### Docker Compose Fails

**Problem**: `docker-compose up -d` fails

**Solution**:
```bash
# Check docker-compose.yml syntax
docker-compose config

# Check for missing images
docker-compose pull

# Try starting services individually
docker-compose up banco-mysql
docker-compose up banco-backend
docker-compose up banco-frontend
```

### Health Checks Fail

**Problem**: Health checks return unhealthy

**Solution**:
```bash
# Check service logs
docker-compose logs <service-name>

# Test health endpoint manually
curl http://localhost:3000/health
curl http://localhost:8080/actuator/health

# Increase health check timeout
# In docker-compose.yml:
healthcheck:
  interval: 60s
  timeout: 30s
  retries: 5
```

### Nginx Proxy Errors

**Problem**: Nginx returns 502 Bad Gateway

**Solution**:
```bash
# Check Nginx configuration
docker exec banco-proxy nginx -t

# Check upstream server is running
curl http://banco-frontend:3000/health

# Check Nginx logs
docker logs banco-proxy

# Verify network connectivity
docker exec banco-proxy ping banco-frontend
```

## Getting Help

### Log Files

```bash
# Frontend logs
docker logs banco-frontend

# Backend logs
docker logs banco-backend

# MySQL logs
docker logs banco-mysql

# Nginx logs
docker logs banco-proxy
```

### Debug Mode

```bash
# Enable debug logging in backend
# In application.yml:
logging:
  level:
    com.bancoddd: DEBUG

# Enable debug mode in frontend
# In .env.local:
NEXT_PUBLIC_DEBUG=true
```

### Contact Support

If issues persist:

1. Check [Integration Guide](./INTEGRATION_GUIDE.md)
2. Check [Run Locally](./RUN_LOCAL.md)
3. Review logs for error messages
4. Contact support team with:
   - Error message
   - Steps to reproduce
   - Log files
   - Environment details
