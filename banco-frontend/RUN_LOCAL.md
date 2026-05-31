# Run Locally - BancoDDD Enterprise Full Stack

## Overview

This guide provides step-by-step instructions for running the BancoDDD full stack application locally on your machine for development and testing.

## Prerequisites

### Required Software

- **Docker** 20.10+ - [Download](https://docs.docker.com/get-docker/)
- **Docker Compose** 2.0+ - Included with Docker Desktop
- **Node.js** 20+ - [Download](https://nodejs.org/)
- **npm** 10+ - Included with Node.js
- **Git** 2.30+ - [Download](https://git-scm.com/downloads)

### Verify Installation

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js
node --version
npm --version

# Check Git
git --version
```

## Quick Start

### Option 1: Docker Compose (Recommended)

This is the easiest way to run the complete stack:

```bash
# Navigate to frontend directory
cd banco-frontend

# Start all services
docker-compose -f docker-compose.full.yml up -d

# View logs
docker-compose -f docker-compose.full.yml logs -f

# Stop services
docker-compose -f docker-compose.full.yml down
```

### Option 2: Manual Setup

Run each component separately for development:

## Backend Setup

### 1. Clone Backend Repository

```bash
cd ../banco-backend
```

### 2. Configure Database

```bash
# Start MySQL with Docker
docker run -d \
  --name banco-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=banco_ddd \
  -e MYSQL_USER=banco_user \
  -e MYSQL_PASSWORD=banco_password \
  -p 3306:3306 \
  mysql:8.0
```

### 3. Configure Backend

```bash
# Copy example configuration
cp src/main/resources/application.yml.example src/main/resources/application.yml

# Edit configuration with your database credentials
# Update database URL, username, password
```

### 4. Build and Run Backend

```bash
# Build with Maven
./mvnw clean package

# Run with Maven
./mvnw spring-boot:run

# Or run the JAR directly
java -jar target/banco-backend-1.0.0.jar
```

### 5. Verify Backend

```bash
# Check health endpoint
curl http://localhost:8080/actuator/health

# Expected response
{"status":"UP"}
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd banco-frontend

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment file
cp .env.development .env.local

# Edit .env.local with your backend URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### 3. Run Development Server

```bash
# Start development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### 4. Verify Frontend

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response
{"status":"healthy"}
```

## Demo Mode

### Enable Demo Mode

Demo mode allows you to run the frontend without a backend:

```bash
# Edit .env.local
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
NEXT_PUBLIC_MOCK_DELAY=500
```

### Run in Demo Mode

```bash
# Start development server
npm run dev

# The application will use mock data
# No backend connection required
```

## Database Setup

### Using Docker (Recommended)

```bash
# Start MySQL container
docker run -d \
  --name banco-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=banco_ddd \
  -e MYSQL_USER=banco_user \
  -e MYSQL_PASSWORD=banco_password \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0

# Connect to MySQL
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd
```

### Using Local MySQL

```bash
# Install MySQL locally
# Windows: https://dev.mysql.com/downloads/mysql/
# macOS: brew install mysql
# Linux: sudo apt-get install mysql-server

# Start MySQL service
# Windows: Start MySQL service from Services
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql

# Create database
mysql -u root -p
CREATE DATABASE banco_ddd;
CREATE USER 'banco_user'@'localhost' IDENTIFIED BY 'banco_password';
GRANT ALL PRIVILEGES ON banco_ddd.* TO 'banco_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Seed Database

The backend will automatically create tables on startup. To seed with demo data:

```bash
# Run backend with seed profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=seed
```

## Testing

### Run Tests

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint
```

### Manual Testing

1. **Login**: Navigate to http://localhost:3000/login
2. **Dashboard**: Check dashboard loads correctly
3. **Accounts**: Test account operations
4. **Transfers**: Test transfer operations
5. **Loans**: Test loan operations
6. **Batches**: Test batch operations
7. **Users**: Test user management
8. **Audit**: Check audit logs

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8080
netstat -ano | findstr :3306

# Kill process
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
lsof -i :8080
lsof -i :3306

# Kill process
kill -9 <PID>
```

### Backend Connection Failed

```bash
# Check if backend is running
curl http://localhost:8080/actuator/health

# Check backend logs
# View backend console output

# Verify API URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Database Connection Failed

```bash
# Check if MySQL is running
docker ps | grep banco-mysql

# Check MySQL logs
docker logs banco-mysql

# Test MySQL connection
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd
```

### Docker Issues

```bash
# Clean up Docker
docker-compose -f docker-compose.full.yml down -v

# Remove all containers
docker rm -f $(docker ps -aq)

# Remove all images
docker rmi -f $(docker images -q)

# Restart Docker
# Windows: Restart Docker Desktop
# macOS: Restart Docker Desktop
# Linux: sudo systemctl restart docker
```

### Node Modules Issues

```bash
# Clear cache
rm -rf node_modules
rm -rf .next
rm package-lock.json

# Reinstall
npm install
```

## Development Workflow

### Frontend Development

```bash
# Start development server
npm run dev

# Make changes to code
# Changes will hot-reload automatically

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

### Backend Development

```bash
# Start backend server
./mvnw spring-boot:run

# Make changes to code
# Backend will hot-reload with Spring DevTools

# Run tests
./mvnw test

# Build
./mvnw clean package
```

### Full Stack Development

```bash
# Terminal 1: Start MySQL
docker run -d --name banco-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=banco_ddd \
  -e MYSQL_USER=banco_user \
  -e MYSQL_PASSWORD=banco_password \
  -p 3306:3306 \
  mysql:8.0

# Terminal 2: Start Backend
cd banco-backend
./mvnw spring-boot:run

# Terminal 3: Start Frontend
cd banco-frontend
npm run dev
```

## Production Build

### Frontend Production Build

```bash
# Build for production
npm run build

# Test production build
npm run start

# Build output in .next directory
```

### Backend Production Build

```bash
# Build with Maven
./mvnw clean package -Pprod

# Run production JAR
java -jar target/banco-backend-1.0.0.jar
```

## Environment Variables

### Frontend Variables

```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_MOCK_MODE=false
NEXT_PUBLIC_MOCK_DELAY=500
```

### Backend Variables

```env
SPRING_PROFILES_ACTIVE=development
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/banco_ddd
SPRING_DATASOURCE_USERNAME=banco_user
SPRING_DATASOURCE_PASSWORD=banco_password
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600000
SERVER_PORT=8080
```

## Useful Commands

### Docker Commands

```bash
# View running containers
docker ps

# View container logs
docker logs <container-name>

# Execute command in container
docker exec -it <container-name> bash

# Stop all containers
docker-compose -f docker-compose.full.yml stop

# Remove all containers
docker-compose -f docker-compose.full.yml rm -f

# View resource usage
docker stats
```

### Database Commands

```bash
# Connect to MySQL
docker exec -it banco-mysql mysql -u banco_user -pbanco_password banco_ddd

# Show tables
SHOW TABLES;

# Describe table
DESCRIBE cuentas;

# Query table
SELECT * FROM cuentas LIMIT 10;

# Backup database
docker exec banco-mysql mysqldump -u banco_user -pbanco_password banco_ddd > backup.sql

# Restore database
docker exec -i banco-mysql mysql -u banco_user -pbanco_password banco_ddd < backup.sql
```

### Git Commands

```bash
# Check status
git status

# Pull latest changes
git pull origin main

# Commit changes
git add .
git commit -m "Your commit message"
git push origin main

# Create new branch
git checkout -b feature/your-feature-name
```

## Next Steps

After running locally:

1. **Test Features**: Test all features end-to-end
2. **Review Logs**: Check logs for errors
3. **Performance**: Monitor performance metrics
4. **Security**: Verify security measures
5. **Documentation**: Review documentation

## Support

### Common Issues

- **Port conflicts**: Change ports in configuration
- **Memory issues**: Increase Docker memory allocation
- **Network issues**: Check firewall settings
- **Permission issues**: Run with appropriate permissions

### Getting Help

- Check [Integration Guide](./INTEGRATION_GUIDE.md)
- Check [Troubleshooting](./TROUBLESHOOTING.md)
- Check [API Integration](./API_INTEGRATION.md)
- Contact support team
