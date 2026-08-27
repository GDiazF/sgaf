import React from 'react'
import { TileLayer } from 'react-leaflet'
import { MAP_BASEMAPS } from './mapBasemaps'

export function MapBasemapTileLayer({ basemap = 'street' }) {
  const config = MAP_BASEMAPS[basemap] || MAP_BASEMAPS.street
  const layers = config.layers || [{ url: config.url }]

  return layers.map((layer, index) => {
    const options = {
      url: layer.url,
      maxZoom: layer.maxZoom ?? 19,
      maxNativeZoom: layer.maxNativeZoom ?? layer.maxZoom ?? 19,
    }

    if (layer.subdomains) {
      options.subdomains = layer.subdomains
    }

    if (layer.url.includes('{r}')) {
      options.detectRetina = true
    }

    if (index === layers.length - 1 && config.attribution) {
      options.attribution = config.attribution
    }

    return <TileLayer key={`${basemap}-${index}`} {...options} />
  })
}

export function MapBasemapSwitcher({ value = 'street', onChange, className = '' }) {
  return (
    <div
      className={`map-basemap-switcher${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Tipo de mapa"
    >
      {Object.entries(MAP_BASEMAPS).map(([key, config]) => (
        <button
          key={key}
          type="button"
          className={value === key ? 'is-active' : undefined}
          aria-pressed={value === key}
          onClick={() => onChange?.(key)}
        >
          {config.label}
        </button>
      ))}
    </div>
  )
}
