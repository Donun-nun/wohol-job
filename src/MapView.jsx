import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const AU_POSITIONS = {
  WA:  [-25.5, 121.6],
  NT:  [-19.5, 133.0],
  QLD: [-22.0, 144.0],
  SA:  [-30.0, 135.5],
  NSW: [-32.0, 147.5],
  VIC: [-37.0, 144.5],
  TAS: [-42.0, 147.0],
  ACT: [-35.3, 149.1],
}

function makeIcon(state, count, active) {
  const bg = active ? '#2C1A00' : '#C8963C'
  const color = active ? '#FFD580' : '#fff'
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:${color};border-radius:50%;width:50px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.35);font-family:sans-serif;transition:transform 0.15s" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'"><span>${state}</span>${count > 0 ? `<span style="font-size:9px;opacity:0.9">${count}개</span>` : ''}</div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  })
}

export default function MapView({ jobs, onSelectRegion, selectedRegion }) {
  const stateCounts = {}
  jobs.forEach(j => { stateCounts[j.region] = (stateCounts[j.region] || 0) + 1 })

  return (
    <MapContainer
      center={[-28, 134]}
      zoom={4}
      style={{ height: 360, borderRadius: 12, border: '1px solid #E8E2D8' }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.entries(AU_POSITIONS).map(([state, pos]) => (
        <Marker
          key={state}
          position={pos}
          icon={makeIcon(state, stateCounts[state] || 0, selectedRegion === state)}
          eventHandlers={{ click: () => onSelectRegion(selectedRegion === state ? '전체' : state) }}
        />
      ))}
    </MapContainer>
  )
}
