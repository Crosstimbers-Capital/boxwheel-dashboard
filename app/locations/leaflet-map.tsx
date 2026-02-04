'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

interface LeafletMapProps {
  locations: TrailerLocation[]
}

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Component to fit bounds to all markers
function FitBounds({ locations }: { locations: TrailerLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [locations, map])

  return null
}

export function LeafletMap({ locations }: LeafletMapProps) {
  // Default center (continental US)
  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const defaultZoom = 4

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {locations.map((location) => (
        <Marker
          key={location.unit}
          position={[location.latitude, location.longitude]}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-base mb-1">{location.unit}</p>
              <p><strong>Branch:</strong> {location.branch}</p>
              <p><strong>Customer:</strong> {location.customer_id}</p>
              <p><strong>Type:</strong> {location.type_bucket}</p>
              <hr className="my-2" />
              <p><strong>Location:</strong> {location.gps_city}, {location.gps_state}</p>
              {location.address && <p className="text-xs text-gray-600">{location.address}</p>}
              <p><strong>Speed:</strong> {location.speed || 0} mph</p>
              <p className="text-xs text-gray-500 mt-1">
                Updated: {location.last_update ? new Date(location.last_update).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      <FitBounds locations={locations} />
    </MapContainer>
  )
}
