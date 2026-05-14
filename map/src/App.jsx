import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'
import './App.css'

const API_KEY = 'AIzaSyCndXuXSgRuyKieRQEOehIRy44LPcmabT8'

const venues = [
  {
    id: 1,
    name: 'とどろきアリーナ',
    address: '神奈川県川崎市中原区等々力1-3',
    lat: 35.5765,
    lng: 139.6540,
    time: '09:30',
    description: '開会式・運動会'
  },
  {
    id: 2,
    name: 'キラナガーデン豊洲',
    address: '東京都江東区豊洲6-4-1',
    lat: 35.6528,
    lng: 139.7954,
    time: '17:00',
    description: 'BBQ'
  },
]

const libraries = ['places']

const travelModes = [
  { label: '🚃 電車', value: 'TRANSIT' },
  { label: '🚶 徒歩', value: 'WALKING' },
  { label: '🚗 車', value: 'DRIVING' },
]

function App() {
  const [selected, setSelected] = useState(null)
  const [directions, setDirections] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [travelMode, setTravelMode] = useState('TRANSIT')

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries,
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
          alert('ルートが見つかりませんでした')
        }
      }
    )
  }, [userLocation])

  const getUserLocation = (venue) => {
    setSelected(venue)
    setDirections(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => alert('位置情報の取得に失敗しました')
      )
    } else {
      alert('位置情報がサポートされていません')
    }
  }

  const handleTravelMode = (mode) => {
    setTravelMode(mode)
    if (selected && userLocation) {
      getRoute(selected, mode)
    }
  }

  if (!isLoaded) return <div className="loading">地図を読み込み中...</div>

  return (
    <div className="container">
      <h1 className="title">会場MAP</h1>

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
            <div className="venue-arrow">→</div>
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
                onClick={() => getRoute(selected, travelMode)}
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
                {mode.label}
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
                {travelModes.find(m => m.value === travelMode)?.label}
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
    </div>
  )
}

export default App