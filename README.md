# Boxwheel Dashboard

Fleet management and analytics dashboard for Boxwheel trailer leasing.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Database:** SQL Server on AWS RDS
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Then fill in database credentials and dashboard password

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter the dashboard password.

## Project Structure

```
├── app/                    # Next.js pages and API routes
│   ├── api/metrics/       # Data endpoints
│   ├── fleet/             # Fleet utilization page
│   └── login/             # Authentication
├── components/
│   ├── ui/                # Reusable components (shadcn)
│   ├── charts/            # Visualization components
│   └── layout/            # Sidebar, Header
├── lib/
│   ├── db.ts              # Database connections
│   └── queries/           # SQL queries by domain
├── DEVELOPMENT.md         # Development guide
└── SPEC.md                # Technical specification
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TRIDENT_DB_HOST` | Trident RDS hostname |
| `TRIDENT_DB_NAME` | Database name (Trident_boxwheel) |
| `TRIDENT_DB_USER` | Database username |
| `TRIDENT_DB_PASSWORD` | Database password |
| `ANALYTICS_DB_HOST` | Analytics RDS hostname (optional) |
| `ANALYTICS_DB_NAME` | Analytics database name |
| `DASHBOARD_PASSWORD` | Shared login password |

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development workflow, including:
- Adding new metrics
- Creating API routes
- Using UI components
- Database query patterns

## Deployment

Deployed via Vercel. Push to `main` triggers production deployment.

Set environment variables in Vercel project settings.
