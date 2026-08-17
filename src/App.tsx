import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Compass,
  Crosshair,
  ChevronsDownUp,
  ChevronsUpDown,
  Layers3,
  LocateFixed,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import type { SelectedSkyObject } from './components/SkyViewport'
import type { LayerState, SkySimulation } from './engine/simulationState'
import { cities, defaultCityIndex } from './data/catalog'
import { SimulationClock } from './engine/simulationClock'
import { SKY_FOV_DEG } from './engine/skyProjection'

const SkyViewport = lazy(() => import('./components/SkyViewport'))

const defaultLayers: LayerState = {
  stars: true,
  constellationLines: true,
  constellationNames: true,
  bodies: true,
  horizon: true,
  ecliptic: true,
  celestialEquator: true,
  equatorialGrid: false,
  horizontalGrid: false,
  milkyWay: true,
  daylightEffect: true,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function App() {
  const [activeCityIndex, setActiveCityIndex] = useState(defaultCityIndex)
  const [manualPosition, setManualPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(240)
  const [magnitudeLimit, setMagnitudeLimit] = useState(5.5)
  const [layers, setLayers] = useState(defaultLayers)
  const [view, setView] = useState({ azimuth: 180, altitude: 0, fov: SKY_FOV_DEG })
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)
  const [isTimeDeckOpen, setIsTimeDeckOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedSkyObject | null>(null)
  const objectCardRef = useRef<HTMLElement>(null)
  const clock = useRef(new SimulationClock())
  const timelineAnchor = useRef(currentTime.getTime())
  const [timelineOffset, setTimelineOffset] = useState(0)

  const selectedCity = cities[activeCityIndex]
  const observer = manualPosition
    ? { ...selectedCity, ...manualPosition, name: '自定义坐标' }
    : selectedCity
  const simulationRef = useRef<SkySimulation>({
    utcMillis: currentTime.getTime(),
    observer: { latitude: observer.latitude, longitude: observer.longitude },
    magnitudeLimit,
    layers,
    azimuth: view.azimuth,
    altitude: view.altitude,
    fov: view.fov,
  })
  simulationRef.current = {
    utcMillis: isPlaying ? simulationRef.current.utcMillis : currentTime.getTime(),
    observer: { latitude: observer.latitude, longitude: observer.longitude },
    magnitudeLimit,
    layers,
    azimuth: view.azimuth,
    altitude: view.altitude,
    fov: view.fov,
  }
  const formattedTime = useMemo(() => new Intl.DateTimeFormat('zh-CN', {
    timeZone: observer.timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(currentTime), [currentTime, observer.timeZone])

  useEffect(() => {
    if (!isPlaying) {
      clock.current.pause()
      clock.current.seek(currentTime.getTime())
      return
    }
    clock.current.seek(currentTime.getTime())
    clock.current.play(speed)
    let frame = 0
    let lastUi = 0
    const tick = () => {
      const utcMillis = clock.current.now().utcMillis
      simulationRef.current.utcMillis = utcMillis
      const now = performance.now()
      if (now - lastUi >= 200) {
        lastUi = now
        setCurrentTime(new Date(utcMillis))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, speed])

  const adjustTime = (milliseconds: number) => {
    setIsPlaying(false)
    setCurrentTime((value) => {
      const next = new Date(value.getTime() + milliseconds)
      clock.current.seek(next.getTime())
      timelineAnchor.current = next.getTime()
      setTimelineOffset(0)
      return next
    })
  }

  const resetNow = () => {
    setIsPlaying(false)
    const now = new Date()
    clock.current.seek(now.getTime())
    timelineAnchor.current = now.getTime()
    setTimelineOffset(0)
    setCurrentTime(now)
    setView({ azimuth: 180, altitude: 0, fov: SKY_FOV_DEG })
    setSelected(null)
  }

  const updateLayer = (key: keyof LayerState) => {
    setLayers((value) => ({ ...value, [key]: !value[key] }))
  }

  const onViewChange = useCallback((next: { azimuth: number; altitude: number; fov: number }) => {
    simulationRef.current.azimuth = next.azimuth
    simulationRef.current.altitude = next.altitude
    simulationRef.current.fov = next.fov
    setView(next)
  }, [])

  return (
    <main className="app-shell">
      <Suspense fallback={<div className="sky-viewport" />}>
        <SkyViewport
          simulationRef={simulationRef}
          onViewChange={onViewChange}
          onSelect={setSelected}
          selected={selected}
          objectCardRef={objectCardRef}
        >
          {selected && (
            <aside className="object-card" ref={objectCardRef}>
              <button className="icon-button object-close" onClick={() => setSelected(null)} aria-label="关闭详情"><X size={15} /></button>
              <span className="eyebrow">{selected.type === 'star' ? '恒星' : '行星'}</span>
              <h2>{selected.name}</h2>
              <div className="object-stats">
                {selected.constellation && <span><small>星座</small>{selected.constellation}</span>}
                {selected.magnitude !== undefined && <span><small>视星等</small>{selected.magnitude.toFixed(2)}</span>}
                <span><small>高度</small><b data-stat="altitude">{selected.altitude.toFixed(1)}°</b></span>
                <span><small>方位</small><b data-stat="azimuth">{selected.azimuth.toFixed(1)}°</b></span>
              </div>
            </aside>
          )}
        </SkyViewport>
      </Suspense>

      <div className="atmosphere-panel" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={16} strokeWidth={1.7} /></span>
          <span>AD ASTRA</span>
          <i />
          <small>实时星空</small>
        </div>
        <div className="topbar-meta">
          <button className="icon-button" onClick={resetNow} aria-label="回到此时此地"><RotateCcw size={17} /></button>
          <button
            className={`icon-button ${isSettingsOpen ? 'is-active' : ''}`}
            onClick={() => setIsSettingsOpen((value) => !value)}
            aria-label={isSettingsOpen ? '收起控制台' : '展开控制台'}
            aria-pressed={isSettingsOpen}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </header>

      <section className="observation-strip">
        <div className="observation-cell">
          <MapPin size={15} />
          <div>
            <span>地点</span>
            <strong>{observer.name}</strong>
          </div>
        </div>
        <div className="observation-cell observation-time">
          <CircleDot size={15} />
          <div>
            <span>{observer.timeZone}</span>
            <strong>{formattedTime}</strong>
          </div>
        </div>
        <div className="observation-cell azimuth-readout">
          <Compass size={15} />
          <div>
            <span>视线</span>
            <strong>{Math.round(view.azimuth)}° · 仰角 {Math.round(view.altitude)}°</strong>
          </div>
        </div>
      </section>

      <aside className={`control-panel ${isSettingsOpen ? '' : 'is-collapsed'}`} aria-hidden={!isSettingsOpen}>
        <div className="panel-scroll">
          <section className="control-section">
            <div className="section-title"><MapPin size={14} /> 地点</div>
            <select id="city" className="select-control" aria-label="城市" value={activeCityIndex} onChange={(event) => {
              setManualPosition(null)
              setActiveCityIndex(Number(event.target.value))
            }}>
              {cities.map((city, index) => <option value={index} key={city.name}>{city.name}</option>)}
            </select>
            <div className="coordinate-input-row">
              <label>纬度
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="0.01"
                  value={observer.latitude}
                  onChange={(event) => setManualPosition((value) => ({ latitude: clamp(Number(event.target.value), -90, 90), longitude: value?.longitude ?? selectedCity.longitude }))}
                />
              </label>
              <label>经度
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="0.01"
                  value={observer.longitude}
                  onChange={(event) => setManualPosition((value) => ({ latitude: value?.latitude ?? selectedCity.latitude, longitude: clamp(Number(event.target.value), -180, 180) }))}
                />
              </label>
            </div>
            <label className="field-label" htmlFor="datetime">时刻</label>
            <input
              id="datetime"
              className="datetime-control"
              type="datetime-local"
              value={new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(event) => {
                setIsPlaying(false)
                setCurrentTime(new Date(event.target.value))
              }}
            />
          </section>

          <section className="control-section">
            <div className="section-title"><Layers3 size={14} /> 图层</div>
            <div className="layer-grid">
              {[
                ['stars', '恒星', ''],
                ['milkyWay', '银河', ''],
                ['constellationLines', '星座', ''],
                ['bodies', '行星', ''],
                ['horizon', '地平', ''],
                ['ecliptic', '黄道', '#f0a03a'],
                ['celestialEquator', '天赤道', '#4cc4e8'],
                ['equatorialGrid', '赤道网', ''],
                ['horizontalGrid', '地平网', ''],
              ].map(([key, label, swatch]) => (
                <button
                  key={key}
                  className={`layer-toggle ${layers[key as keyof LayerState] ? 'is-active' : ''} ${key === 'celestialEquator' ? 'is-equator' : ''} ${key === 'ecliptic' ? 'is-ecliptic' : ''}`}
                  onClick={() => updateLayer(key as keyof LayerState)}
                >
                  {swatch && <i className="layer-swatch" style={{ background: swatch }} />}
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="control-section">
            <div className="section-title"><SlidersHorizontal size={14} /> 视星等 <b>≤ {magnitudeLimit.toFixed(1)}</b></div>
            <input
              className="range-control"
              type="range"
              min="-1.5"
              max="8"
              step="0.5"
              value={magnitudeLimit}
              onChange={(event) => setMagnitudeLimit(Number(event.target.value))}
            />
          </section>

          <section className="control-section quick-views">
            <div className="section-title"><Crosshair size={14} /> 视角</div>
            <div className="quick-view-grid">
              {[
                ['东', 90, 0], ['南', 180, 0], ['西', 270, 0], ['北', 0, 0], ['天顶', view.azimuth, 82],
              ].map(([label, nextAzimuth, nextAltitude]) => (
                <button key={label as string} onClick={() => setView({ azimuth: nextAzimuth as number, altitude: nextAltitude as number, fov: view.fov })}>{label}</button>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <footer className={`time-deck ${isTimeDeckOpen ? '' : 'is-collapsed'}`}>
        <div className="time-deck-top">
          <div className="timeline-label"><strong>{currentTime.getFullYear()}</strong></div>
          <div className="playback-actions">
            {isTimeDeckOpen && <button className="time-step" onClick={() => adjustTime(-3600000)} aria-label="后退一小时"><ChevronLeft size={18} /></button>}
            <button className="play-button" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            </button>
            {isTimeDeckOpen && <button className="time-step" onClick={() => adjustTime(3600000)} aria-label="前进一小时"><ChevronRight size={18} /></button>}
          </div>
          {isTimeDeckOpen ? (
            <label className="speed-control">速度
              <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                <option value={1}>实时</option>
                <option value={60}>1 分钟/秒</option>
                <option value={240}>4 分钟/秒</option>
                <option value={3600}>1 小时/秒</option>
                <option value={86400}>1 天/秒</option>
              </select>
            </label>
          ) : (
            <span className="speed-control">{formattedTime}</span>
          )}
          <button
            className="icon-button time-deck-toggle"
            onClick={() => setIsTimeDeckOpen((value) => !value)}
            aria-label={isTimeDeckOpen ? '收起时空序列' : '展开时空序列'}
            aria-pressed={isTimeDeckOpen}
          >
            {isTimeDeckOpen ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
          </button>
        </div>
        {isTimeDeckOpen && (
          <>
            <div className="timeline">
              <span>−6h</span>
              <input
                aria-label="拖动调整时间"
                type="range"
                min="-21600000"
                max="21600000"
                value={timelineOffset}
                onChange={(event) => {
                  const nextOffset = Number(event.target.value)
                  setIsPlaying(false)
                  setTimelineOffset(nextOffset)
                  const next = new Date(timelineAnchor.current + nextOffset)
                  clock.current.seek(next.getTime())
                  setCurrentTime(next)
                }}
                onMouseDown={() => {
                  setIsPlaying(false)
                  timelineAnchor.current = currentTime.getTime()
                  setTimelineOffset(0)
                }}
              />
              <span>+6h</span>
            </div>
            <div className="time-deck-bottom">
              <button onClick={resetNow}><LocateFixed size={14} /> 此时此地</button>
            </div>
          </>
        )}
      </footer>
    </main>
  )
}
