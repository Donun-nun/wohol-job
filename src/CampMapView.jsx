import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const CAMP_COORDS = {
  'Punurunha':     [-23.37, 119.73],
  'Hope Downs 1':   [-23.14, 119.38],
  'Hope Downs 4':   [-22.87, 119.32],
  'Newman Camp':    [-23.36, 119.74],
  'Yandi':          [-22.67, 118.15],
  'Mining Area C':  [-22.87, 117.73],
  'Cloudbreak':     [-22.18, 119.06],
  'Christmas Creek':[-22.35, 119.65],
  'Karara':         [-29.31, 116.31],
  'Sino Iron':      [-20.92, 116.18],
  'Tom Price':      [-22.69, 117.79],
  'Paraburdoo':     [-23.20, 117.67],
  'Pannawonica':    [-21.64, 116.32],
  'South Flank':    [-22.79, 119.07],
  'Jimblebar':      [-23.31, 119.74],
  'Yandicoogina':   [-22.72, 119.05],
}

function makeCampIcon(name, count, active) {
  const bg = active ? '#2C1A00' : '#C8963C'
  const color = active ? '#FFD580' : '#fff'
  const short = name.length > 8 ? name.slice(0, 7) + '…' : name
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:${color};border-radius:8px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.35);font-family:sans-serif;white-space:nowrap;display:flex;flex-direction:column;align-items:center;gap:1px">
      <span>⛏️ ${short}</span>
      ${count > 0 ? `<span style="font-size:9px;opacity:0.85">${count}개 후기</span>` : ''}
    </div>`,
    iconSize: [null, null],
    iconAnchor: [0, 0],
  })
}

export default function CampMapView({ reviews, onSelectCamp, selectedCamp }) {
  const reviewCounts = {}
  reviews.forEach(r => { reviewCounts[r.camp_name] = (reviewCounts[r.camp_name] || 0) + 1 })

  const allCamps = { ...CAMP_COORDS }
  reviews.forEach(r => {
    if (!allCamps[r.camp_name]) allCamps[r.camp_name] = null
  })

  return (
    <MapContainer
      center={[-23.5, 118.5]}
      zoom={6}
      style={{ height: 320, borderRadius: 12, border: '1px solid #E8E2D8' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.entries(allCamps).map(([name, pos]) => {
        if (!pos) return null
        return (
          <Marker
            key={name}
            position={pos}
            icon={makeCampIcon(name, reviewCounts[name] || 0, selectedCamp === name)}
            eventHandlers={{ click: () => onSelectCamp(selectedCamp === name ? '' : name) }}
          >
            <Popup>
              <div style={{ fontFamily: 'Noto Sans KR, sans-serif', fontSize: 13 }}>
                <b>{name}</b><br />
                {reviewCounts[name] ? `후기 ${reviewCounts[name]}개` : '아직 후기 없음'}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
