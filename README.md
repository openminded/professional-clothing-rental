# Professional Clothing Rental Management System

A comprehensive full-stack web application for managing a professional clothing rental business with complete inventory management, booking system, and POS functionality.

## 🚀 Features

### Core Business Functionality
- **Inventory Management**: Complete CRUD operations for clothing items with size/color variants
- **Customer Management**: Customer profiles with rental history and contact information
- **Rental System**: Multi-item cart with real-time availability checking and race condition prevention
- **Point of Sale (POS)**: Intuitive interface for cashiers to process transactions
- **Automated Laundry Cycles**: 3-day automatic laundry processing with scheduled job management
- **Payment Processing**: Support for cash, transfer, and card payments
- **Reporting Dashboard**: Comprehensive analytics for financial, inventory, and rental metrics

### Technical Features
- **Role-Based Access Control**: Cashier, Manager, and Admin roles with appropriate permissions
- **Real-time Updates**: Live inventory status and availability
- **Database Transactions**: Race condition prevention with proper locking mechanisms
- **Activity Logging**: Complete audit trail for all system actions
- **Responsive Design**: Mobile-friendly interface
- **Data Visualization**: Interactive charts and reports using Recharts

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router with Turbopack)
- **Language**: TypeScript
- **Authentication**: [Better Auth](https://better-auth.com/) with role-based access
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (New York style)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/) for data visualization
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **API**: Next.js API Routes with RESTful architecture
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Schema Management**: Drizzle Kit migrations
- **Validation**: Zod schemas for input validation
- **Authentication**: Better Auth with session management

### Automation & DevOps
- **Scheduled Jobs**: Vercel Cron Jobs for laundry cycle processing
- **Docker Support**: Containerized deployment
- **Health Monitoring**: System health check endpoints
- **Database Migrations**: Version-controlled schema changes

## 📋 System Requirements

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud-based)
- npm or yarn package manager

### Database Requirements
- PostgreSQL 12+ (recommended)
- Connection pooling support
- Transaction support

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd professional-clothing-rental
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database URL and secrets
DATABASE_URL=postgresql://username:password@localhost:5433/postgres
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Start PostgreSQL (using Docker)
npm run db:up

# Run database migrations
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📊 Business Workflows

### Workflow A: Rental Registration
1. Customer arrives at store
2. Cashier searches and selects available items
3. Items added to rental cart with return dates
4. Customer information entered or selected
5. Payment processed (cash/transfer/card)
6. System generates rental invoice
7. Transaction complete

### Workflow B: Item Pickup
1. Customer presents rental invoice
2. Cashier verifies rental in system
3. Items marked as "picked up" with timestamp
4. System generates pickup receipt
5. Customer receives items

### Workflow C: Item Return
1. Customer returns items
2. Cashier checks item completeness
3. System calculates any late fees
4. Additional payment processed if needed
5. Items marked as returned
6. Automatic 3-day laundry cycle initiated
7. Items blocked from rental during laundry
8. Auto-availability after 3 days

## 🏗 Database Schema

### Core Entities
- **Users**: Staff with role-based access (cashier, manager, admin)
- **Customers**: Customer profiles and contact information
- **ClothingModels**: Base clothing items with pricing
- **InventoryItems**: Size/color variants with individual tracking
- **Rentals**: Main rental transactions
- **RentalItems**: Junction table for rental-line items
- **Payments**: Payment records and transaction history
- **LaundryCycles**: Automated laundry process tracking
- **ActivityLogs**: Comprehensive audit trail

### Key Relationships
- Each ClothingModel can have multiple InventoryItems (size/color variants)
- Each InventoryItem can be rented by one customer at a time
- Rentals can include multiple items
- Activity is logged for all critical actions
- Laundry cycles are automatically created on item return

## 🎯 User Roles & Permissions

### Cashier Role
- Process rental transactions
- Handle item pickups and returns
- Record payments and generate invoices
- View basic inventory availability

### Manager Role
- All cashier capabilities
- Manage inventory (CRUD operations)
- View comprehensive reports and analytics
- Override item availability
- Access financial reports

### Admin Role
- All manager capabilities
- Manage users and permissions
- System configuration
- Full system access

## 📈 Reporting & Analytics

### Financial Reports
- Revenue tracking (daily/weekly/monthly)
- Payment method breakdown
- Cash inflow/outflow analysis
- Top customer performance
- Transaction volume metrics

### Inventory Reports
- Current availability status
- Items in laundry with return dates
- Overdue returns tracking
- Damaged/unavailable items
- Rental history per item
- Utilization rates analysis

### Rental Reports
- Active rentals monitoring
- Overdue return alerts
- Customer rental history
- Cashier performance metrics
- Transaction completion rates

## 🔧 Automated Systems

### Laundry Cycle Management
- **Automatic Processing**: Items automatically enter 3-day laundry cycles on return
- **Scheduled Completion**: Hourly job processes overdue cycles
- **Manual Override**: Staff can complete cycles early or extend duration
- **Status Tracking**: Real-time laundry cycle monitoring
- **Activity Logging**: Complete audit trail for laundry operations

### System Health Monitoring
- **Database Health**: Connection and performance monitoring
- **Memory Usage**: Application memory tracking
- **Error Tracking**: Comprehensive error logging
- **API Performance**: Response time monitoring

## 🐳 Docker Deployment

### Development Setup
```bash
# Using Docker Compose
docker compose up -d

# Development database
docker compose --profile dev up postgres-dev -d
```

### Production Build
```bash
# Build production image
docker build -t clothing-rental-system .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=your-database-url \
  -e BETTER_AUTH_SECRET=your-secret \
  clothing-rental-system
```

## 🚀 Production Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push
4. Cron jobs automatically configured

### Other Platforms
- Railway: Full-stack deployment with PostgreSQL
- DigitalOcean: App Platform with managed database
- AWS: Elastic Beanstalk with RDS
- Self-hosted: Docker with external PostgreSQL

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.**

## 🔒 Security Features

### Authentication & Authorization
- Secure session management with Better Auth
- Role-based access control
- Input validation with Zod schemas
- SQL injection prevention via Drizzle ORM

### Data Protection
- Database transactions for data integrity
- Race condition prevention
- Activity logging for audit trails
- Secure password handling

### API Security
- Request validation
- Rate limiting ready (implementation recommended)
- CORS configuration
- Environment variable protection

## 🧪 Testing

### Database Testing
```bash
# Reset database
npm run db:reset

# Seed test data
npm run db:seed

# Run database studio
npm run db:studio
```

### API Testing
- All endpoints include comprehensive error handling
- Input validation with detailed error messages
- Database transaction testing

## 📚 API Documentation

### Core Endpoints
- `GET/POST /api/inventory` - Inventory management
- `GET/POST /api/customers` - Customer management
- `GET/POST /api/rentals` - Rental operations
- `POST /api/rentals/[id]/pickup` - Process item pickup
- `POST /api/rentals/[id]/return` - Process item return
- `GET/POST /api/payments` - Payment processing
- `GET /api/reports/*` - Reports and analytics

### Management Endpoints
- `GET/POST /api/models` - Clothing model management
- `POST /api/laundry/process` - Manual laundry processing
- `POST /api/laundry/cycles/[id]/complete` - Complete laundry early
- `POST /api/laundry/cycles/[id]/extend` - Extend laundry cycle

### System Endpoints
- `GET /api/system/health` - System health check
- `GET /api/cron/laundry-processing` - Scheduled job trigger

## 🔧 Development Tools

### Database Management
```bash
# Generate migrations
npm run db:generate

# Push schema changes
npm run db:push

# View database in studio
npm run db:studio

# Reset database
npm run db:reset
```

### Code Quality
```bash
# Run linter
npm run lint

# Type checking
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [deployment guide](./DEPLOYMENT.md)
- Review the API documentation in code comments
- Check system logs for troubleshooting
- Monitor health check endpoint: `/api/system/health`

---

**Built with ❤️ for professional clothing rental businesses**