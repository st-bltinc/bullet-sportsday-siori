import { useState, useCallback } from 'react'
import { Footprints, Car, Bus, TramFront, ChevronRight } from 'lucide-react'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'
import './App.css'

const API_KEY = 'AIzaSyCndXuXSgRuyKieRQEOehIRy44LPcmabT8'

const venues = [
  {
    id: 1,
    name: 'とどろきアリーナ',
    address: '神奈川県川崎市中原区等々力1-3',
    lat: 35.5875286,
    lng: 139.6473653,
    time: '09:30',
    description: '開会式・運動会'
  },
  {
    id: 2,
    name: 'キラナガーデン豊洲',
    address: '東京都江東区豊洲6-5-27',
    lat: 35.6425265,
    lng: 139.7776937,
    time: '17:00',
    description: 'BBQ'
  },
  {
    id: 3,
    name: '新宿野村ビル',
    address: '東京都新宿区西新宿1-26-2',
    lat: 35.6929509,
    lng: 139.6953653,
    time: '21:00',
    description: '二次会'
  },
]

const libraries = ['places']

const travelModes = [
  { label: '徒歩', value: 'WALKING', lucide: Footprints },
  { label: '車', value: 'DRIVING', lucide: Car },
  { label: 'バス', value: 'BUS', lucide: Bus },
  { label: '電車', value: 'TRANSIT', lucide: TramFront },
]

function App() {
  const [selected, setSelected] = useState(null)
  const [directions, setDirections] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [travelMode, setTravelMode] = useState('WALKING')

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries,
    language: 'ja',
    region: 'JP',
  })

  const getRoute = useCallback((venue, mode) => {
    if (!userLocation) return
    setLoadingRoute(true)
    setDirections(null)
    const service = new window.google.maps.DirectionsService()
    service.route(
      {
        origin: userLocation,
        destination: { lat: venue.lat, lng: venue.lng },
        travelMode: window.google.maps.TravelMode[mode],
      },
      (result, status) => {
        setLoadingRoute(false)
        if (status === 'OK') {
          setDirections(result)
        } else {
          alert(`ルートエラー: ${status}`)
        }
      }
    )
  }, [userLocation])

  const openGoogleMaps = (venue, mode) => {
    const modeMap = { TRANSIT: 'transit', BUS: 'transit', DRIVING: 'driving', WALKING: 'walking' }
    const gmMode = modeMap[mode] || 'transit'
    const busParam = mode === 'BUS' ? '&travelmode=transit&dirflg=b' : `&travelmode=${gmMode}`
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${venue.lat},${venue.lng}${busParam}`
      window.open(url, '_blank')
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}${busParam}`
      window.open(url, '_blank')
    }
  }

  const getUserLocation = (venue) => {
    setSelected(venue)
    setDirections(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => alert('位置情報の取得に失敗しました'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      alert('位置情報がサポートされていません')
    }
  }

  const handleTravelMode = (mode) => {
    setTravelMode(mode)
    if (selected && userLocation) {
      if (mode === 'TRANSIT' || mode === 'BUS') {
        openGoogleMaps(selected, mode)
      } else {
        getRoute(selected, mode)
      }
    }
  }

  if (!isLoaded) return <div className="loading">地図を読み込み中...</div>

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-accent" />
        <h1 className="title">会場MAP</h1>
      </div>

      <div className="venue-list">
        {venues.map(venue => (
          <div
            key={venue.id}
            className={`venue-card ${selected?.id === venue.id ? 'active' : ''}`}
            onClick={() => getUserLocation(venue)}
          >
            <div className="venue-time">{venue.time}</div>
            <div className="venue-info">
              <div className="venue-name">{venue.name}</div>
              <div className="venue-desc">{venue.description}</div>
              <div className="venue-address">{venue.address}</div>
            </div>
            <div className="venue-arrow"><ChevronRight size={18} strokeWidth={1.8} /></div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="map-area">
          <div className="map-header">
            <span className="map-title">{selected.name}</span>
            {userLocation && (
              <button
                className="btn-route"
                onClick={() => {
                  if (travelMode === 'TRANSIT' || travelMode === 'BUS') {
                    openGoogleMaps(selected, travelMode)
                  } else {
                    getRoute(selected, travelMode)
                  }
                }}
                disabled={loadingRoute}
              >
                {loadingRoute ? '検索中...' : '経路を表示'}
              </button>
            )}
          </div>

          <div className="travel-modes">
            {travelModes.map(mode => (
              <button
                key={mode.value}
                className={`btn-mode ${travelMode === mode.value ? 'active' : ''}`}
                onClick={() => handleTravelMode(mode.value)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{(() => { const Icon = mode.lucide; return <Icon size={16} strokeWidth={1.8} /> })()}{mode.label}</span>
              </button>
            ))}
          </div>

          <GoogleMap
            mapContainerClassName="map"
            center={{ lat: selected.lat, lng: selected.lng }}
            zoom={15}
          >
            <Marker position={{ lat: selected.lat, lng: selected.lng }} />
            {userLocation && <Marker position={userLocation} label="現在地" />}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>

          {directions && (
            <div className="route-info">
              <div className="route-summary">
                {(() => { const mode = travelModes.find(m => m.value === travelMode); if (!mode) return null; const Icon = mode.lucide; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.3rem' }}><Icon size={15} strokeWidth={1.8} />{mode.label}</span> })()}
                {directions.routes[0].legs[0].duration.text}（{directions.routes[0].legs[0].distance.text}）
              </div>
              <div className="route-steps">
                {directions.routes[0].legs[0].steps.map((step, i) => (
                  <div key={i} className="route-step" dangerouslySetInnerHTML={{ __html: step.instructions }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <a href="https://wagahai.mixh.jp/2026/" className="home-fab"><img src="/2026/logo-home.png" alt="ホーム" style={{ width: '60px', height: '60px', objectFit: 'contain' }} /></a>
    </div>
  )
}

export default App