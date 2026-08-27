import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { City } from '@/data/cities'
import {
  GEOCODING_MIN_QUERY_LENGTH,
  searchCities,
  type GeocodedPlace,
} from '@/engine/location/geocodingService'
import { localizedName, useT, type Locale } from '@/i18n'
import { isAbortError } from '@/shared/errors/appError'
import styles from './CityCombobox.module.css'

type Props = {
  cities: readonly City[]
  observerId: string
  currentLabel: string
  locale: Locale
  onSelectCity: (index: number) => void
  onSelectPlace: (place: City) => void
  onNotice: (message: string) => void
}

function toCity(place: GeocodedPlace): City {
  return {
    id: place.id,
    names: { zh: place.name, en: place.name },
    latitude: place.latitude,
    longitude: place.longitude,
    timeZone: place.timeZone,
  }
}

export default function CityCombobox({
  cities,
  observerId,
  currentLabel,
  locale,
  onSelectCity,
  onSelectPlace,
  onNotice,
}: Props) {
  const t = useT()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [composing, setComposing] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [results, setResults] = useState<GeocodedPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 240 })

  const searchQuery = (query ?? '').trim()
  const searching = searchQuery.length >= GEOCODING_MIN_QUERY_LENGTH

  const close = () => {
    setOpen(false)
    setQuery(null)
    setResults([])
    setLoading(false)
    setHighlight(0)
  }

  const items = searching
    ? results.map((place) => ({
      id: place.id,
      title: place.name,
      subtitle: place.regionLabel,
      pick: () => {
        onSelectPlace(toCity(place))
        close()
      },
    }))
    : cities.map((city, index) => ({
      id: city.id,
      title: localizedName(city.names, locale),
      subtitle: '',
      pick: () => {
        onSelectCity(index)
        close()
      },
    }))

  const syncMenu = () => {
    const node = rootRef.current
    if (!node) return
    const box = node.getBoundingClientRect()
    setMenuBox({ top: box.bottom + 6, left: box.left, width: Math.max(box.width, 240) })
  }

  useLayoutEffect(() => {
    if (open) syncMenu()
  }, [open, items.length, loading])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-city-menu]')) return
      close()
    }
    window.addEventListener('resize', syncMenu)
    window.addEventListener('scroll', syncMenu, true)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('resize', syncMenu)
      window.removeEventListener('scroll', syncMenu, true)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || composing || !searching) {
      if (!searching) {
        setResults([])
        setLoading(false)
      }
      return
    }

    const controller = new AbortController()
    setResults([])
    setLoading(true)
    const timer = window.setTimeout(() => {
      void searchCities(searchQuery, controller.signal)
        .then((places) => {
          setResults(places)
          setHighlight(0)
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return
          onNotice(t('location.searchFailed'))
          setResults([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [composing, open, onNotice, searchQuery, searching, t])

  const moveHighlight = (delta: number) => {
    if (items.length === 0) return
    setHighlight((value) => (value + delta + items.length) % items.length)
  }

  const banner = !searching
    ? t('location.shortcuts')
    : loading
      ? t('location.searching')
      : results.length === 0
        ? t('location.noResults')
        : null

  return (
    <div className={styles.root} ref={rootRef}>
      <input
        ref={inputRef}
        className={styles.input}
        role="combobox"
        aria-label={t('location.city')}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        placeholder={t('location.searchPlaceholder')}
        value={query ?? currentLabel}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          setHighlight(Math.max(0, cities.findIndex((city) => city.id === observerId)))
          requestAnimationFrame(syncMenu)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={(event) => {
          setQuery(event.currentTarget.value)
          setComposing(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            items[highlight]?.pick()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            close()
            inputRef.current?.blur()
          }
        }}
      />
      {open && createPortal(
        <div
          className={styles.menu}
          data-city-menu
          id={listId}
          role="listbox"
          style={menuBox}
        >
          {banner && (
            <p className={searching ? styles.status : styles.heading}>{banner}</p>
          )}
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === index}
                  className={`${styles.option} ${highlight === index ? styles.active : ''}`}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={item.pick}
                >
                  <strong>{item.title}</strong>
                  {item.subtitle ? <span>{item.subtitle}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
