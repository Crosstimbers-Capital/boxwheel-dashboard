'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { FileDown, Loader2, Truck, DollarSign, Clock, MapPin, Database } from 'lucide-react'
import { buckets, timePeriods } from '@/lib/config'

type IconName = 'truck' | 'dollar-sign' | 'clock' | 'map-pin' | 'database'

const iconMap = {
  'truck': Truck,
  'dollar-sign': DollarSign,
  'clock': Clock,
  'map-pin': MapPin,
  'database': Database,
}

interface Report {
  id: string
  title: string
  description: string
  iconName: IconName
  filters: string[]
  endpoint: string
}

interface ReportCardProps {
  report: Report
  branches: string[]
}

export function ReportCard({ report, branches }: ReportCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({
    branch: 'all',
    type: 'all',
    usage: 'all',
    idleBucket: 'all',
    period: 'LTM',
    status: 'all',
    state: 'all',
  })

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      report.filters.forEach(filterKey => {
        if (filters[filterKey] && filters[filterKey] !== 'all') {
          params.append(filterKey, filters[filterKey])
        }
      })

      const response = await fetch(`${report.endpoint}?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      // Get filename from content-disposition header or use default
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${report.id}-report.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/)
        if (match) filename = match[1]
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const Icon = iconMap[report.iconName]

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{report.title}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {report.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Filters */}
        <div className="space-y-3 mb-4">
          {report.filters.includes('branch') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Branch
              </label>
              <Select value={filters.branch} onValueChange={(v) => updateFilter('branch', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {report.filters.includes('type') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {buckets.type.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {report.filters.includes('usage') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Usage Category
              </label>
              <Select value={filters.usage} onValueChange={(v) => updateFilter('usage', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {buckets.usage.map((usage) => (
                    <SelectItem key={usage.value} value={usage.value}>{usage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {report.filters.includes('idleBucket') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Idle Duration
              </label>
              <Select value={filters.idleBucket} onValueChange={(v) => updateFilter('idleBucket', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Durations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Durations</SelectItem>
                  {buckets.idleDuration.map((bucket) => (
                    <SelectItem key={bucket.value} value={bucket.value}>{bucket.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {report.filters.includes('period') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Time Period
              </label>
              <Select value={filters.period} onValueChange={(v) => updateFilter('period', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {timePeriods.options.map((period) => (
                    <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {report.filters.includes('status') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="LEASED">Leased</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          className="w-full mt-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              Download CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
