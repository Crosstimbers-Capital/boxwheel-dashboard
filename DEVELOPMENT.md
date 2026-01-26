# Development Guide

This guide explains how to add new metrics and views to the Boxwheel dashboard.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.local.example .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000` (password is in your .env.local file)

---

## Project Structure

```
boxwheel-dashboard/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (data fetching)
│   │   └── metrics/       # Metric endpoints
│   ├── fleet/             # Fleet utilization page
│   ├── login/             # Login page
│   └── page.tsx           # Dashboard home
├── components/
│   ├── ui/                # Reusable UI components (Button, Card, etc.)
│   ├── charts/            # Chart components (UtilizationTrend, etc.)
│   └── layout/            # Layout components (Sidebar, Header)
├── lib/
│   ├── db.ts              # Database connections
│   ├── queries/           # SQL queries organized by domain
│   └── utils.ts           # Helper functions
└── DEVELOPMENT.md         # This file
```

---

## Adding a New Metric

### 1. Write the SQL Query

Create or update a file in `lib/queries/`. Each file groups related queries.

```typescript
// lib/queries/revenue.ts

/**
 * Monthly revenue by branch
 */
export const revenueByBranch = `
  SELECT
    Branch,
    SUM(Amount) as total_revenue,
    COUNT(*) as invoice_count
  FROM Invoice
  WHERE InvoiceDate >= DATEADD(month, -1, GETDATE())
  GROUP BY Branch
  ORDER BY total_revenue DESC
`
```

**Tips:**
- Add comments explaining what the query does
- Use COALESCE for nullable fields you want to display
- Cast to FLOAT for percentages to avoid integer division
- Test queries in DBeaver first

### 2. Create the API Route

API routes live in `app/api/`. They fetch data and return JSON.

```typescript
// app/api/metrics/revenue/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'
import { revenueByBranch } from '@/lib/queries/revenue'

export async function GET(request: NextRequest) {
  try {
    const data = await queryTrident(revenueByBranch)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Revenue API error:', error)

    // Show detailed errors in dev, generic in prod
    const message = process.env.NODE_ENV === 'development'
      ? error instanceof Error ? error.message : 'Unknown error'
      : 'Failed to fetch revenue data'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### 3. Create the Page

Pages are React Server Components that can fetch data directly.

```typescript
// app/revenue/page.tsx

import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { queryTrident } from '@/lib/db'
import { revenueByBranch } from '@/lib/queries/revenue'
import { formatCurrency } from '@/lib/utils'

interface RevenueRow {
  Branch: string
  total_revenue: number
  invoice_count: number
}

async function getRevenueData() {
  try {
    const data = await queryTrident<RevenueRow>(revenueByBranch)
    return { data, error: null }
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Error' }
  }
}

export default async function RevenuePage() {
  const { data, error } = await getRevenueData()

  return (
    <div className="flex flex-col">
      <Header title="Revenue" description="Revenue metrics by branch" />

      <div className="p-6">
        {error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Your table/chart here */}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

### 4. Add Navigation

Update the sidebar in `components/layout/Sidebar.tsx`:

```typescript
const navigation = [
  // ... existing items
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
]
```

---

## Database Connections

Two databases are configured:

| Database | Function | Use Case |
|----------|----------|----------|
| `queryTrident()` | Source operational data | TSpecs, TLeases, Invoice |
| `queryAnalytics()` | Computed views | vw_fleet_utilization, etc. |

```typescript
import { queryTrident, queryAnalytics } from '@/lib/db'

// Query source tables
const trailers = await queryTrident('SELECT * FROM TSpecs')

// Query analytics views (when available)
const metrics = await queryAnalytics('SELECT * FROM vw_fleet_utilization')
```

### Parameterized Queries

For queries with user input, use parameters to prevent SQL injection:

```typescript
import { queryWithParams } from '@/lib/db'

const results = await queryWithParams<Trailer>(
  'SELECT * FROM TSpecs WHERE City = @branch',
  { branch: 'Denver' }
)
```

---

## Available UI Components

### Cards

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>My Card</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Tables

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Branch</TableHead>
      <TableHead>Utilization</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(row => (
      <TableRow key={row.id}>
        <TableCell>{row.branch}</TableCell>
        <TableCell>{row.utilization}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Badges

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>Default</Badge>
<Badge variant="success">High</Badge>
<Badge variant="warning">Medium</Badge>
<Badge variant="destructive">Low</Badge>
```

### Charts

```tsx
import { UtilizationTrend } from '@/components/charts'

<UtilizationTrend
  data={[
    { label: 'Jan', utilization: 0.72 },
    { label: 'Feb', utilization: 0.75 },
  ]}
  height={300}
/>
```

---

## Utility Functions

```typescript
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'

formatCurrency(1234.56)  // "$1,235"
formatPercent(0.7234)    // "72.3%"
formatNumber(1234567)    // "1,234,567"
```

---

## Common Patterns

### Loading States

For client components that fetch data:

```tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'

function MyComponent() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return <Skeleton className="h-32 w-full" />
  }

  return <div>Content</div>
}
```

### Error Boundaries

Wrap risky components:

```tsx
{error ? (
  <Card className="border-destructive">
    <CardContent className="pt-6">
      <p className="text-sm text-destructive">{error}</p>
    </CardContent>
  </Card>
) : (
  <YourComponent />
)}
```

---

## Testing Queries

1. Open DBeaver and connect to the database
2. Write and test your SQL query
3. Copy to `lib/queries/yourfile.ts`
4. Create API route and page
5. Run `npm run dev` and verify

---

## Deployment

Grant handles deployment. When you're ready:

1. Push your branch to GitHub
2. Vercel creates a preview deployment automatically
3. Share the preview URL for review
4. After approval, merge to main → production deploy

---

## Key Tables Reference

| Table | Description | Key Fields |
|-------|-------------|------------|
| `TSpecs` | All trailers | Unit, Status, Type, Length, Usage, City, Year |
| `TLeases` | Lease records | LeaseID, Status, Rate, StartDate, EndDate |
| `Invoice` | Invoice headers | InvoiceID, CustomerID, Amount, InvoiceDate |
| `InvoiceDetails` | Line items | InvoiceID, Description, Amount |

### Status Values (TSpecs)

- `LEASED` - Currently on rent
- `AVAILABLE` - Ready to lease
- `BOS` - Bill of Sale (sold)
- Others: maintenance, hold, etc.

### Usage Categories (Age Buckets)

- `OTR` - Over the Road (0-7 years)
- `CARTAGE` - Local/short haul (8-15 years)
- `STORAGE` - Storage use (16+ years)
