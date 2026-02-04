'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface TrailerLocation {
  unit: string
  branch: string
  customer_id: string
  latitude: number
  longitude: number
  last_update: string
  speed: number
  address: string
  gps_city: string
  gps_state: string
  type_bucket: string
}

interface LocationMapProps {
  locations: TrailerLocation[]
}

// Dynamically import Leaflet to avoid SSR issues
export function LocationMap({ locations }: LocationMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ locations: TrailerLocation[] }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if leaflet is available
    import('leaflet')
      .then(() => import('react-leaflet'))
      .then(() => {
        // Dynamically import the actual map component
        import('./leaflet-map').then((mod) => {
          setMapComponent(() => mod.LeafletMap)
        })
      })
      .catch((e) => {
        console.error('Leaflet not available:', e)
        setError('Leaflet library not installed')
      })
  }, [])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30 p-8">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Map Library Required</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          To enable the interactive map, install the Leaflet packages:
        </p>
        <code className="bg-muted px-4 py-2 rounded text-sm">
          npm install leaflet react-leaflet @types/leaflet
        </code>
        <p className="text-xs text-muted-foreground mt-4">
          Then restart your development server.
        </p>
      </div>
    )
  }

  if (!MapComponent) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading map...</span>
        </div>
      </div>
    )
  }

  return <MapComponent locations={locations} />
}
