import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Modal, Badge, Icon, IconButton } from '@slep/ui'

const createMarkerIcon = (color, active = false) =>
  L.divIcon({
    className: 'map-marker-icon',
    html: `<div class="map-marker${active ? ' is-active' : ''}" style="--marker:${color}"><span></span></div>`,
    iconSize: active ? [32, 32] : [26, 26],
    iconAnchor: active ? [16, 32] : [13, 26],
  })

const ICON = {
  idle: createMarkerIcon('#3d8ebd'),
  active: createMarkerIcon('#1a6f9a', true),
}

const MapEffects = ({ center, zoom, focus }) => {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom)
  }, [center, zoom, map])
  useEffect(() => {
    if (!focus) return undefined
    map.panTo(focus, { animate: true })
    return undefined
  }, [focus, map])
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120)
    const id2 = window.setTimeout(() => map.invalidateSize(), 360)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(id2)
    }
  }, [map])
  return null
}

const EstablishmentMapModal = ({
  isOpen,
  onClose,
  establishment,
  allEstablishments = [],
}) => {
  const isGlobalView = !establishment
  const iquiqueCenter = [-20.2307, -70.1357]
  const activeEst = establishment
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setSelected(null)
      return
    }
    setSelected(activeEst || null)
  }, [isOpen, activeEst])

  const position =
    activeEst?.latitud && activeEst?.longitud
      ? [parseFloat(activeEst.latitud), parseFloat(activeEst.longitud)]
      : iquiqueCenter

  const markers = allEstablishments.filter(
    (e) =>
      e.latitud &&
      e.longitud &&
      !Number.isNaN(parseFloat(e.latitud)) &&
      !Number.isNaN(parseFloat(e.longitud)),
  )

  const focusPoint =
    selected?.latitud && selected?.longitud
      ? [parseFloat(selected.latitud), parseFloat(selected.longitud)]
      : null

  const mapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${selected.latitud},${selected.longitud}`
    : null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isGlobalView ? 'Red educativa SLEP' : activeEst?.nombre || 'Mapa'}
      subheader={
        isGlobalView
          ? `Mapa de establecimientos · ${markers.length} con ubicación`
          : activeEst?.direccion || 'Ubicación del establecimiento'
      }
      className="modal--shell modal--map"
      bodyClassName="map-modal__body"
    >
      <div className="map-modal__canvas">
        {isOpen ? (
          <MapContainer
            key={isGlobalView ? 'global-map' : `est-${activeEst?.id || 'single'}`}
            center={position}
            zoom={isGlobalView ? 13 : 16}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {markers.map((marker) => {
              const isActive = selected?.id === marker.id
              return (
                <Marker
                  key={marker.id}
                  position={[parseFloat(marker.latitud), parseFloat(marker.longitud)]}
                  icon={isActive ? ICON.active : ICON.idle}
                  eventHandlers={{
                    click: () => setSelected(marker),
                  }}
                />
              )
            })}
            <MapEffects
              center={position}
              zoom={isGlobalView ? 13 : 16}
              focus={focusPoint}
            />
          </MapContainer>
        ) : null}

        {selected ? (
          <aside className="map-selection" aria-live="polite">
            <div className="record-card map-selection__card">
              <div className="record-card__header">
                <div className="record-card__primary">
                  <Badge variant="accent">Establecimiento</Badge>
                  <h3 className="record-card__title">{selected.nombre}</h3>
                  <p className="record-card__subtitle">RBD {selected.rbd || '—'}</p>
                </div>
                <IconButton
                  aria-label="Cerrar ficha"
                  onClick={() => setSelected(isGlobalView ? null : activeEst)}
                >
                  <Icon name="close" size={18} />
                </IconButton>
              </div>

              <div className="record-card__meta">
                <div className="record-card__meta-line">
                  <span className="record-card__meta-label">Dirección</span>
                  <span className="record-card__meta-value">
                    {selected.direccion || 'Sin dirección registrada'}
                  </span>
                </div>
                {selected.tipo_nombre ? (
                  <div className="record-card__meta-line">
                    <span className="record-card__meta-label">Tipo</span>
                    <span className="record-card__meta-value">{selected.tipo_nombre}</span>
                  </div>
                ) : null}
              </div>

              <div className="record-card__actions">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary btn--sm record-card__action-primary"
                >
                  Abrir en Google Maps
                  <Icon name="external" size={14} />
                </a>
              </div>
            </div>
          </aside>
        ) : (
          <div className="map-selection map-selection--hint" aria-hidden="false">
            <p className="map-selection__hint">
              Seleccione un marcador para ver la ficha del establecimiento.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default EstablishmentMapModal
