# Boxwheel Analytics Dashboard

A modern, responsive analytics dashboard for Boxwheel's fleet management operations. Built with Next.js 14, Tailwind CSS, and shadcn/ui.

## Features

### Pages

| Page | Description |
|------|-------------|
| **Overview** | High-level KPIs with visual status indicators (utilization, idle assets, rate performance) |
| **Fleet Utilization** | Breakdown by type, usage category, and branch with heatmap matrix |
| **Revenue** | Actual billed rates vs card rate benchmarks, variance analysis |
| **Idle Assets** | Track non-leased trailers, opportunity cost, critical (24+ months) alerts |
| **Location Tracking** | Interactive Leaflet map showing GPS positions of leased trailers |
| **Reports** | Download filtered data sets as CSV for offline analysis |

### Key Features

- **Status Indicators**: Visual "traffic light" system for performance metrics
  - Green (Good): Utilization ≥80%, Rate at/above card
  - Yellow (Warning): Utilization 60-80%, Rate within 10% of card
  - Red (Critical): Utilization <60%, Rate >10% below card, Idle >24 months

- **Filters**: All pages support filtering by:
  - Branch (dynamically loaded from TSpecs.Fleetcity)
  - Type Bucket (DRY_VAN, REEFER, etc.)
  - Usage Category (OTR_0-2, CART_1-2, STORAGE)
  - Time Period (LTM, YTD, LQA, etc.)

- **Export**: CSV downloads for all major data sets with applied filters

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Maps**: Leaflet (react-leaflet)
- **Database**: SQL Server via `mssql` package

## Getting Started

### Prerequisites

```bash
# Node.js 18+
node --version

# Install dependencies
npm install

# For map functionality (optional)
npm install leaflet react-leaflet @types/leaflet
```

### Environment Variables

Create `.env.local` with:

```bash
# Trident Database (source data)
TRIDENT_DB_HOST=boxwheel-db.ctwycqgc81z4.us-east-2.rds.amazonaws.com
TRIDENT_DB_NAME=Trident_boxwheel
TRIDENT_DB_USER=admin
TRIDENT_DB_PASSWORD=your-password

# Analytics Database (computed views)
ANALYTICS_DB_HOST=boxwheel-analytics.ctwycqgc81z4.us-east-2.rds.amazonaws.com
ANALYTICS_DB_NAME=Analytics
ANALYTICS_DB_USER=admin
ANALYTICS_DB_PASSWORD=your-password

# Authentication
DASHBOARD_PASSWORD=your-dashboard-password
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

### Thresholds

Performance thresholds are configurable in `lib/config.ts`:

```typescript
export const thresholds = {
  utilization: {
    good: 0.80,      // 80% and above = green
    warning: 0.60,   // 60-79% = yellow
  },
  rateVariance: {
    good: 0,         // At or above card rate = green
    warning: -0.10,  // Up to 10% below = yellow
  },
  idleDuration: {
    healthy: 6,      // 0-6 months = acceptable
    warning: 12,     // 6-12 months = needs attention
    critical: 24,    // 24+ months = critical
  },
}
```

### Color Scheme

Brand colors from the CRM are defined in `lib/config.ts` and `app/globals.css`:

- **Primary**: Steel Blue (`rgb(32, 131, 213)`) - main interactive elements
- **Accent**: Lime Green (`rgb(167, 192, 51)`) - used sparingly for positive highlights
- **Background**: Off-white (`hsl(210 20% 98%)`) - clean, modern look

## Database Dependencies

### Required Views (Analytics DB)

These views must exist in the Analytics database:

| View | Source Migration |
|------|------------------|
| `vw_LQA_bucketStatistics` | `20260115183000_bucket_statistics.sql` |
| `vw_TSpecs_Enriched` | `20260127130000_standardized_specs.sql` |
| `vw_IdleAssetsOverTime` | `20260202100000_idle_assets_view.sql` |
| `vw_RevenueDetails` | `20260202110000_revenue_details_view.sql` |
| `t_cardRates` | `20260127090000_card_rates.sql` |

### GPS Data (Location Tracking)

The Location Tracking page requires access to:
- `Trident_SpireonAPI.dbo.AssetStatuses`

If not accessible, the page will display a helpful error message.

## Project Structure

```
boxwheel-dashboard/
├── app/
│   ├── page.tsx                 # Overview dashboard
│   ├── fleet/                   # Fleet utilization page
│   ├── revenue/                 # Revenue analysis page
│   ├── idle/                    # Idle assets page
│   ├── locations/               # GPS tracking page
│   ├── reports/                 # Report downloads
│   └── api/reports/             # CSV export endpoints
├── components/
│   ├── ui/                      # shadcn components + custom KPI cards
│   ├── charts/                  # Recharts wrappers
│   └── layout/                  # Sidebar, Header
├── lib/
│   ├── config.ts                # Thresholds, colors, bucket definitions
│   ├── db.ts                    # Database connections
│   ├── queries/                 # SQL query definitions
│   └── utils.ts                 # Formatting helpers
└── public/
    └── boxwheel_logo.png        # Brand assets
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

Ensure environment variables are configured in Vercel project settings.

## Data Refresh

Data is refreshed nightly at ~7:00 PM MST when the Trident backup is restored to the RDS instance. The dashboard footer displays this refresh schedule.
