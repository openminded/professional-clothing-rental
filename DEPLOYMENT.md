# Professional Clothing Rental Management System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Professional Clothing Rental Management System. The system is built with Next.js, Drizzle ORM, PostgreSQL, and includes automated laundry cycle management.

## System Architecture

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Components**: Radix UI (shadcn/ui)
- **Charts**: Recharts
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit migrations
- **Authentication**: Better Auth with role-based access control

### Automation
- **Laundry Cycles**: Automated processing via cron jobs
- **Database**: PostgreSQL (recommended: Vercel Postgres or Supabase)
- **Scheduled Jobs**: Vercel Cron Jobs (hourly processing)

## Environment Variables

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-domain.com

# Cron Job Security (Optional but recommended)
CRON_SECRET=your-cron-secret-here
```

### Optional Environment Variables

```bash
# Development
NODE_ENV=production
```

## Database Setup

### Option 1: Vercel Postgres (Recommended)
1. Install Vercel Postgres from the Vercel marketplace
2. Create a new database
3. Copy the `DATABASE_URL` to your environment variables
4. Run migrations: `npm run db:push`

### Option 2: Supabase
1. Create a Supabase project
2. Get the connection string from project settings
3. Set `DATABASE_URL` environment variable
4. Run migrations: `npm run db:push`

### Option 3: External PostgreSQL
1. Set up PostgreSQL instance (AWS RDS, Railway, etc.)
2. Create database
3. Set `DATABASE_URL` environment variable
4. Run migrations: `npm run db:push`

## Migration Process

### Initial Setup
```bash
# Install dependencies
npm install

# Generate and push database schema
npm run db:generate
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### Schema Updates
```bash
# Generate new migration
npm run db:generate

# Apply to database
npm run db:push
```

## Deployment Platforms

### Vercel (Recommended)

#### Prerequisites
- Vercel account
- GitHub repository connected to Vercel

#### Steps
1. **Connect Repository**:
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. **Configure Vercel**:
   - Import your GitHub repository in Vercel
   - Framework preset: Next.js
   - Build command: `npm run build`
   - Install command: `npm install`

3. **Environment Variables**:
   Add all required environment variables in Vercel dashboard

4. **Configure Cron Jobs**:
   The `vercel.json` file includes automatic configuration for:
   - Laundry processing: Every hour at minute 0
   - Health checks: Available via `/api/system/health`

5. **Deploy**:
   ```bash
   # Push changes to trigger deployment
   git push origin main
   ```

#### Vercel Cron Configuration
The system automatically configures:
```json
{
  "crons": [
    {
      "path": "/api/cron/laundry-processing",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Docker Deployment

#### Build Image
```bash
# Build Docker image
docker build -t clothing-rental-system .

# Run with PostgreSQL
docker-compose up -d
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clothing_rental
      - BETTER_AUTH_SECRET=your-secret
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=clothing_rental
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Add PostgreSQL service
3. Set environment variables
4. Deploy automatically on push

## Automated Systems

### Laundry Cycle Management

The system includes automated laundry cycle processing:

#### Features
- **Automatic Processing**: Items returned from rentals automatically enter 3-day laundry cycles
- **Scheduled Completion**: Overdue cycles are automatically processed hourly
- **Manual Override**: Staff can complete or extend cycles as needed
- **Activity Logging**: All cycle events are logged for audit trails

#### API Endpoints
- `GET /api/laundry/process` - View laundry statistics
- `POST /api/laundry/process` - Manual trigger for processing
- `POST /api/laundry/cycles/[id]/complete` - Complete cycle early
- `POST /api/laundry/cycles/[id]/extend` - Extend cycle duration

#### Cron Job
```bash
# Runs every hour
curl -X GET "https://your-domain.com/api/cron/laundry-processing" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### System Monitoring

#### Health Check Endpoint
- `GET /api/system/health` - Comprehensive system health status

#### Response Format
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 45 },
    "laundrySystem": { "status": "healthy", "stats": {...} },
    "memory": { "status": "healthy", "percentage": 65 }
  }
}
```

## Security Considerations

### Authentication
- Role-based access control (Cashier, Manager, Admin)
- Secure session management with Better Auth
- Input validation with Zod schemas

### Database Security
- Connection pooling
- Prepared statements via Drizzle ORM
- Transaction handling for race condition prevention

### API Security
- Request validation
- SQL injection prevention
- Rate limiting (recommend implementing in production)

### Cron Job Security
- Optional secret token for cron endpoints
- IP restrictions (if needed)
- Request logging

## Performance Optimization

### Database Indexes
The schema includes optimized indexes for:
- Customer lookups (phone, email)
- Inventory searches (SKU, status, model)
- Rental queries (status, dates)
- Payment processing (dates, status)

### Caching
- Consider implementing Redis for session storage
- API response caching for reports
- Static asset optimization

### Monitoring
- System health checks
- Error logging
- Performance metrics
- Database query monitoring

## Maintenance

### Regular Tasks
1. **Database Backups**: Ensure regular backups are configured
2. **Log Monitoring**: Check application and error logs
3. **Performance**: Monitor response times and database queries
4. **Security**: Keep dependencies updated

### Troubleshooting

#### Common Issues
1. **Database Connection**: Check `DATABASE_URL` format and permissions
2. **Migration Failures**: Verify database schema and permissions
3. **Cron Jobs**: Check Vercel cron configuration and logs
4. **Authentication**: Verify Better Auth configuration

#### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check database connection
npm run db:studio
```

## Support

### Documentation
- API documentation: Available via code comments
- Database schema: `db/schema/` directory
- Component documentation: Component files

### Logs
- Application logs: Vercel dashboard or server logs
- Database logs: PostgreSQL logs
- Cron job logs: Vercel function logs

### Monitoring Tools
- Vercel Analytics
- Database performance monitoring
- Custom health checks

---

## Quick Start Checklist

1. [ ] Set up PostgreSQL database
2. [ ] Configure environment variables
3. [ ] Run database migrations
4. [ ] Deploy to Vercel or preferred platform
5. [ ] Test basic functionality
6. [ ] Verify cron job configuration
7. [ ] Set up monitoring and alerts
8. [ ] Create backup procedures

For support or issues, refer to the application logs or contact the development team.