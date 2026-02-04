import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { queryTrident } from '@/lib/db'
import { activeBranches } from '@/lib/queries/branches'
import { FileDown } from 'lucide-react'
import { ReportCard } from './report-card'

async function getBranches() {
  try {
    const branchList = await queryTrident<{ branch: string }>(activeBranches)
    return branchList.map(b => b.branch)
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return []
  }
}

const reports = [
  {
    id: 'utilization',
    title: 'Fleet Utilization Report',
    description: 'Current utilization breakdown by branch, type, and usage category',
    iconName: 'truck' as const,
    filters: ['branch', 'type', 'usage'],
    endpoint: '/api/reports/utilization',
  },
  {
    id: 'revenue',
    title: 'Revenue vs Card Rate Report',
    description: 'Comparison of actual billed rates against card rate benchmarks',
    iconName: 'dollar-sign' as const,
    filters: ['branch', 'type', 'period'],
    endpoint: '/api/reports/revenue',
  },
  {
    id: 'idle',
    title: 'Idle Assets Report',
    description: 'Detailed list of all idle trailers with duration and opportunity cost',
    iconName: 'clock' as const,
    filters: ['branch', 'type', 'idleBucket'],
    endpoint: '/api/reports/idle',
  },
  {
    id: 'critical-idle',
    title: 'Critical Idle Report (24+ Months)',
    description: 'Trailers that have been idle for over 24 months requiring action',
    iconName: 'clock' as const,
    filters: ['branch'],
    endpoint: '/api/reports/critical-idle',
  },
  {
    id: 'never-leased',
    title: 'Never-Leased Trailers',
    description: 'Trailers that have never had a lease since purchase',
    iconName: 'clock' as const,
    filters: ['branch', 'type'],
    endpoint: '/api/reports/never-leased',
  },
  {
    id: 'locations',
    title: 'Trailer Locations Report',
    description: 'Current GPS locations of all leased trailers',
    iconName: 'map-pin' as const,
    filters: ['branch', 'state'],
    endpoint: '/api/reports/locations',
  },
  {
    id: 'fleet-inventory',
    title: 'Fleet Inventory Report',
    description: 'Complete list of all trailers with specifications and current status',
    iconName: 'database' as const,
    filters: ['branch', 'type', 'status'],
    endpoint: '/api/reports/inventory',
  },
]

export default async function ReportsPage() {
  const branches = await getBranches()

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Reports"
        description="Download filtered data sets for analysis"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Info Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <FileDown className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Export Data</p>
                <p className="text-sm text-muted-foreground">
                  Select filters and download data as CSV files for further analysis in Excel or other tools.
                  All reports reflect the most recent data refresh (nightly at ~7:00 PM MST).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              branches={branches}
            />
          ))}
        </div>

        {/* Custom Query Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need a Custom Report?</CardTitle>
            <CardDescription>
              If you need data that isn&apos;t covered by the standard reports above, 
              contact the analytics team to create a custom export.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email: <a href="mailto:analytics@boxwheel.com" className="text-primary hover:underline">analytics@boxwheel.com</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
