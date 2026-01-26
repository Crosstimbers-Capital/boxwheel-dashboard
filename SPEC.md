# Boxwheel Management Dashboard

## Technical Specification

**Version:** 0.1  
**Last Updated:** January 26, 2026  
**Author:** Grant / Crosstimbers Catalyst Team

---

## 1. Overview

### Purpose

Build a management dashboard that surfaces key operational metrics for Boxwheel's leadership team. The dashboard will pull from a dedicated analytics layer on top of the existing RDS infrastructure, providing real-time visibility into fleet utilization, revenue performance, and branch-level KPIs.

### Goals

- **Single source of truth** for operational metrics across all branches
- **Fast iteration** — Holly builds queries and views, Grant manages deployment
- **Lightweight architecture** — raw SQL against optimized views, no ORM overhead
- **Extensible foundation** — structure supports future branch manager dashboards and customer-facing portals

### Non-Goals (Phase 1)

- Branch manager individual dashboards (Phase 2)
- Customer-facing portal with trailer locations and reports (Phase 3)
- Real-time data (current architecture is T-1; nightly refresh at ~7:00 PM MST)

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | Server-side rendering, API routes, Vercel-native |
| **Styling** | Tailwind CSS | Utility-first, fast iteration, AI-friendly |
| **Components** | shadcn/ui | Accessible, copy-paste components on Radix primitives |
| **Charts** | Recharts | Simple React charting, good defaults |
| **Database** | SQL Server on RDS | Existing infrastructure; raw SQL via `mssql` package |
| **Auth** | Shared password (Phase 1) | Simple middleware check; NextAuth.js later |
| **Deployment** | Vercel | Zero-config, preview environments, existing pattern |

### Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "tailwindcss": "^3.4.0",
  "mssql": "^10.0.0",
  "recharts": "^2.10.0",
  "@radix-ui/react-*": "latest"
}
```

---

## 3. Data Architecture

### Database Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production (Azure SQL Server)                 │
│                         [Firewalled]                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Nightly backup restore (~7 PM MST)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Boxwheel RDS (SQL Server)                          │
│         boxwheel-db.ctwycqgc81z4.us-east-2.rds.amazonaws.com    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Trident_boxwheel │  │ Trident_Xero │  │ Trident_SpireonAPI│   │
│  │ (Operations)     │  │ (Accounting) │  │ (GPS Tracking)   │   │
│  └──────────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ Views / Transformations
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Analytics RDS (SQL Server)                         │
│   boxwheel-analytics.ctwycqgc81z4.us-east-2.rds.amazonaws.com   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Analytics Database                                        │   │
│  │                                                           │   │
│  │  • vw_fleet_utilization      (utilization by branch/type) │   │
│  │  • vw_revenue_summary        (revenue by period/branch)   │   │
│  │  • vw_idle_assets            (idle trailers with duration)│   │
│  │  • vw_rate_realization       (current rate vs card rate)  │   │
│  │  • vw_LQA_bucketStatistics   (existing utilization view)  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ Raw SQL queries
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js Dashboard (Vercel)                         │
│                                                                  │
│  API Routes → SQL queries → JSON responses → React components   │
└─────────────────────────────────────────────────────────────────┘
```

### Source Tables (Trident_boxwheel)

| Table | Description |
|-------|-------------|
| `TSpecs` | All trailers in the fleet (master asset list) |
| `TLeases` | All lease records |
| `Invoice` | Invoice headers |
| `InvoiceDetails` | Invoice line items |

### Analytics Views (to be built by Holly)

| View | Purpose | Key Fields |
|------|---------|------------|
| `vw_fleet_utilization` | Utilization rates by branch, type, age | branch_id, trailer_type, age_bucket, on_rent_count, total_count, utilization_pct |
| `vw_revenue_summary` | Revenue aggregations | branch_id, period, lease_revenue, mileage_revenue, repair_revenue, total_revenue |
| `vw_idle_assets` | Idle trailers with context | trailer_id, branch_id, days_idle, last_lease_rate, trailer_type, age |
| `vw_rate_realization` | Current rate vs card rate | trailer_id, current_rate, card_rate, variance_pct |
| `vw_branch_kpis` | Branch manager scorecard | branch_id, utilization, revenue, recovery_rate, conversion_rate |

**Note:** Card rate data is not in Trident — will be loaded from team-provided dataset into Supabase/Analytics instance as a reference table.

---

## 4. Core Metrics

### Utilization (Primary KPI)

```
Utilization = Trailers on Rent / Total Trailers
```

- Point-in-time and longitudinal views
- Segmented by: branch, trailer type, age bucket (OTR 0-7yr, Cartage 8-15yr, Storage 16+yr)
- Reference existing `vw_LQA_bucketStatistics` for Reagan's implementation

### Rate Realization

```
Rate Realization = Current Lease Rate / Card Rate
```

- Card rate = "street rate" benchmark set by management
- Surfaces how much revenue is being left on the table

### Recovery

```
Recovery = (Lease Revenue + Mileage Revenue + Repair Revenue) / Wear Costs
```

- Two lease types: mileage-based (~$0.06/mi) vs "net net" (billable repairs)
- Initial focus: understand revenue by trailer from invoices
- Phase 2: incorporate repair/maintenance costs if available in Trident

### Idle Assets

- Count and duration of trailers not on rent
- Bucketed by idle duration: 0-12 months, 12-24 months, 24+ months
- Feeds fleet optimization decisions (hold/transfer/sell)

---

## 5. Project Structure

```
boxwheel-dashboard/
├── app/
│   ├── layout.tsx                 # Root layout with nav, auth check
│   ├── page.tsx                   # Dashboard home / overview
│   ├── login/
│   │   └── page.tsx               # Simple password login
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts           # Password verification
│   │   └── metrics/
│   │       ├── utilization/
│   │       │   └── route.ts       # GET utilization data
│   │       ├── revenue/
│   │       │   └── route.ts       # GET revenue data
│   │       ├── idle-assets/
│   │       │   └── route.ts       # GET idle asset data
│   │       └── branches/
│   │           └── route.ts       # GET branch KPIs
│   ├── fleet/
│   │   └── page.tsx               # Fleet utilization dashboard
│   ├── revenue/
│   │   └── page.tsx               # Revenue summary dashboard
│   ├── idle/
│   │   └── page.tsx               # Idle assets view
│   └── branches/
│       └── page.tsx               # Branch comparison view
├── components/
│   ├── ui/                        # shadcn components (button, card, table, etc.)
│   ├── charts/
│   │   ├── UtilizationChart.tsx
│   │   ├── RevenueChart.tsx
│   │   └── UtilizationMatrix.tsx  # Type x Age heatmap
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── AuthGuard.tsx
├── lib/
│   ├── db.ts                      # SQL Server connection pool
│   ├── queries/
│   │   ├── utilization.ts         # Utilization SQL queries
│   │   ├── revenue.ts             # Revenue SQL queries
│   │   ├── idle.ts                # Idle assets SQL queries
│   │   └── branches.ts            # Branch KPI SQL queries
│   └── auth.ts                    # Simple password auth helpers
├── .env.local                     # DB credentials, auth secret
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## 6. Authentication (Phase 1)

Simple shared password implementation:

1. User visits any page → middleware checks for session cookie
2. No cookie → redirect to `/login`
3. User enters shared password → POST to `/api/auth`
4. Password matches env var → set HTTP-only cookie, redirect to dashboard
5. Cookie expires after 7 days (configurable)

```typescript
// Simplified auth flow
// .env.local
DASHBOARD_PASSWORD=boxwheel2026

// middleware.ts
if (!request.cookies.get('bw_session')) {
  return NextResponse.redirect('/login')
}
```

**Phase 2:** Migrate to NextAuth.js with email/password or SSO when user management is needed.

---

## 7. Database Connection

Using `mssql` package for SQL Server connectivity:

```typescript
// lib/db.ts
import sql from 'mssql'

const config: sql.config = {
  server: process.env.DB_HOST!,
  port: 1433,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config)
  }
  return pool
}

export async function query<T>(sqlQuery: string): Promise<T[]> {
  const conn = await getConnection()
  const result = await conn.request().query(sqlQuery)
  return result.recordset as T[]
}
```

### Environment Variables

```bash
# .env.local

# Analytics Database (primary - use for dashboard queries)
DB_HOST=boxwheel-analytics.ctwycqgc81z4.us-east-2.rds.amazonaws.com
DB_NAME=Analytics
DB_USER=admin
DB_PASSWORD=1oHZKo6fXWp4JgUFp1kA

# Auth
DASHBOARD_PASSWORD=<shared-password>

# Optional: Source database for ad-hoc queries
SOURCE_DB_HOST=boxwheel-db.ctwycqgc81z4.us-east-2.rds.amazonaws.com
```

---

## 8. Example Query Pattern

```typescript
// lib/queries/utilization.ts

export const getUtilizationByBranch = `
  SELECT 
    branch_id,
    branch_name,
    trailer_type,
    age_bucket,
    on_rent_count,
    total_count,
    CAST(on_rent_count AS FLOAT) / NULLIF(total_count, 0) AS utilization_pct
  FROM vw_fleet_utilization
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM vw_fleet_utilization)
  ORDER BY branch_name, trailer_type, age_bucket
`

export const getUtilizationTrend = `
  SELECT 
    snapshot_date,
    SUM(on_rent_count) AS total_on_rent,
    SUM(total_count) AS total_fleet,
    CAST(SUM(on_rent_count) AS FLOAT) / NULLIF(SUM(total_count), 0) AS utilization_pct
  FROM vw_fleet_utilization
  WHERE snapshot_date >= DATEADD(month, -12, GETDATE())
  GROUP BY snapshot_date
  ORDER BY snapshot_date
`
```

```typescript
// app/api/metrics/utilization/route.ts

import { query } from '@/lib/db'
import { getUtilizationByBranch } from '@/lib/queries/utilization'

export async function GET() {
  const data = await query(getUtilizationByBranch)
  return Response.json(data)
}
```

---

## 9. UI Components

### Utilization Matrix

A heatmap showing utilization by trailer type (rows) × age bucket (columns), filterable by branch. Based on the "Rate Yield Matrix" pattern from existing reporting.

| Type | OTR (0-7yr) | Cartage (8-15yr) | Storage (16+yr) |
|------|-------------|------------------|-----------------|
| Dry Van | 14.1% (821) | 22.0% (1794) | 36.5% (6054) |
| Reefer | 0.7% (14) | 49.4% (171) | 75.1% (51) |
| Flatbed | — | 19.8% (89) | 36.9% (88) |

Color scale: green (high utilization) → yellow → red (low utilization)

### Branch Comparison Cards

Side-by-side cards for each branch showing:
- Utilization %
- Revenue (MTD / YTD)
- Idle asset count
- Trend sparkline

### Revenue Time Series

Line chart showing revenue over time with toggles for:
- Total vs by branch
- Lease revenue vs mileage revenue vs repair revenue

---

## 10. Development Workflow

### Holly's Focus

1. **Analytics DB** — Build and optimize views in the Analytics database
2. **Query Development** — Write and test SQL queries, iterate on metric definitions
3. **Dashboard Components** — Build React components that consume the API routes

### Grant's Focus

1. **Boilerplate Setup** — Scaffold repo, deploy to Vercel, configure CI/CD
2. **Infrastructure** — Manage environment variables, database access, deployments
3. **CRM Integration** — Card rate data loading, CRM extensions

### Iteration Pattern

1. Holly writes/tests query in DBeaver against Analytics DB
2. Holly adds query to `/lib/queries/*.ts`
3. Holly creates API route in `/app/api/metrics/*/route.ts`
4. Holly builds React component to consume API
5. PR → Preview deploy on Vercel → Review → Merge → Production
