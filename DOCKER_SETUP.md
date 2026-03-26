# Docker Compose Setup for Local Development

This guide helps you set up the backend dependencies using Docker Compose for local development.

## Prerequisites

- Docker Engine 20.10+ and Docker Compose V2
- Git

## Quick Start

### 1. Start Core Services (Postgres + Redis)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 2. Verify Services are Running

```bash
docker-compose ps
```

You should see both services with status "Up" and healthy.

### 3. Configure Backend

Copy the example environment file and update if needed:

```bash
cd backend
cp .env.example .env
```

Default values in `.env.example` are already configured for Docker Compose services:
- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_USERNAME=postgres`
- `DATABASE_PASSWORD=postgres` (update in docker-compose.yml if changed)
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`

### 4. Install Dependencies and Run Migrations

```bash
cd backend
npm install
npm run migration:run  # If migrations exist
```

### 5. Start Backend

```bash
npm run start:dev
```

## Optional Development Tools

### Redis Commander (Redis GUI)

View and manage Redis data:

```bash
docker-compose --profile tools up -d redis-commander
```

Access at: http://localhost:8081

### Bull Board (Queue Inspector)

Monitor BullMQ job queues:

```bash
docker-compose --profile tools up -d bull-board
```

Access at: http://localhost:3001

### Start All Services Including Tools

```bash
docker-compose --profile tools up -d
```

## Common Commands

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Slate)

```bash
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart a Service

```bash
docker-compose restart postgres
docker-compose restart redis
```

### Access PostgreSQL CLI

```bash
docker-compose exec postgres psql -U postgres -d healthchain
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

## Troubleshooting

### Port Already in Use

If ports 5432 or 6379 are already in use, you can either:

1. Stop the conflicting service
2. Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Use 5433 on host instead
```

Then update `DATABASE_PORT` in your `.env` file accordingly.

### Services Not Starting

Check logs for errors:

```bash
docker-compose logs
```

### Reset Everything

```bash
docker-compose down -v
docker-compose up -d
```

## Production Notes

This Docker Compose setup is for local development only. For production:

- Use managed database services (AWS RDS, Azure Database, etc.)
- Use managed Redis services (AWS ElastiCache, Redis Cloud, etc.)
- Implement proper backup strategies
- Use secrets management
- Configure proper network security
