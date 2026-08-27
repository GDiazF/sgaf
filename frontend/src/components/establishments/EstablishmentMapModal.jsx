import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import { Modal, Icon, IconButton } from '@slep/ui'
import {
  MapBasemapTileLayer,
  MapBasemapSwitcher,
} from '../maps/MapBasemapLayers'
import { MAP_MARKER_ICONS } from '../maps/mapMarkers'

const ICON = MAP_MARKER_ICONS
const IQUIQUE_CENTER = [-20.2307, -70.1357]

const telefonoPrincipal = (est) => {
  const phones = [...(est?.telefonos || [])].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1
    if (!a.es_principal && b.es_principal) return 1
    return 0
  })
  return phones[0]?.numero?.trim() || null
}

const MapInfoRow = ({ icon, label, value, href, emptyText }) => {
  const trimmed = value?.trim?.() ? value.trim() : value || ''
  const isEmpty = !trimmed
  const display = isEmpty ? emptyText : trimmed

  const content = (
    <>
      <span className="map-selection__info-icon" aria-hidden="true">
        <Icon name={icon} size={15} />
      </span>
      <span className="map-selection__info-body">
        <span className="map-selection__info-label">{label}</span>
        <span
          className={
            isEmpty
              ? 'map-selection__info-value map-selection__info-value--empty'
              : 'map-selection__info-value'
          }
        >
          {display}
        </span>
      </span>
    </>
  )

  if (href && !isEmpty) {
    return (
      <li className="map-selection__info-item">
        <a href={href} className="map-selection__info-row map-selection__info-row--link">
          {content}
        </a>
      </li>
    )
  }

  return (
    <li className="map-selection__info-item">
      <div className="map-selection__info-row">{content}</div>
    </li>
  )
}

const MapEffects = ({ focus }) => {
  const map = useMap()

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
  const activeEst = establishment
  const [selected, setSelected] = useState(null)
  const [basemap, setBasemap] = useState('street')

  useEffect(() => {
    if (!isOpen) {
      setSelected(null)
      setBasemap('street')
      return
    }
    setSelected(activeEst || null)
  }, [isOpen, activeEst])

  const position = useMemo(() => {
    if (activeEst?.latitud && activeEst?.longitud) {
      return [parseFloat(activeEst.latitud), parseFloat(activeEst.longitud)]
    }
    return IQUIQUE_CENTER
  }, [activeEst?.latitud, activeEst?.longitud])

  const initialZoom = isGlobalView ? 13 : 16

  const markers = allEstablishments.filter(
    (e) =>
      e.latitud &&
      e.longitud &&
      !Number.isNaN(parseFloat(e.latitud)) &&
      !Number.isNaN(parseFloat(e.longitud)),
  )

  const focusPoint = useMemo(() => {
    if (!selected?.latitud || !selected?.longitud) return null
    return [parseFloat(selected.latitud), parseFloat(selected.longitud)]
  }, [selected?.id, selected?.latitud, selected?.longitud])

  const mapsUrl = selected
    ? `https://www.google.com/maps/search/?api=1&query=${selected.latitud},${selected.longitud}`
    : null

  const selectedPhone = selected ? telefonoPrincipal(selected) : null
  const selectedPhoneHref = selectedPhone
    ? `tel:${selectedPhone.replace(/\s/g, '')}`
    : null
  const selectedAddress = selected
    ? [selected.direccion, selected.ciudad].filter(Boolean).join(', ')
    : ''

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
            zoom={initialZoom}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom
            zoomControl={false}
          >
            <MapBasemapTileLayer basemap={basemap} />
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
            <MapEffects focus={focusPoint} />
          </MapContainer>
        ) : null}

        {isOpen ? (
          <MapBasemapSwitcher value={basemap} onChange={setBasemap} />
        ) : null}

        {selected ? (
          <aside className="map-selection" aria-live="polite">
            <article className="map-selection__card">
              <header className="map-selection__hero">
                <div className="map-selection__hero-main">
                  {selected.logo ? (
                    <div className="map-selection__logo">
                      <img src={selected.logo} alt="" />
                    </div>
                  ) : (
                    <div className="map-selection__logo map-selection__logo--placeholder">
                      <Icon name="establecimientos" size={22} />
                    </div>
                  )}
                  <div className="map-selection__heading">
                    <h3 className="map-selection__title">{selected.nombre}</h3>
                    <div className="map-selection__chips">
                      <span className="map-selection__chip map-selection__chip--mono">
                        RBD {selected.rbd || '—'}
                      </span>
                      {selected.tipo_nombre ? (
                        <span className="map-selection__chip">{selected.tipo_nombre}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <IconButton
                  aria-label="Cerrar ficha"
                  onClick={() => setSelected(isGlobalView ? null : activeEst)}
                >
                  <Icon name="close" size={18} />
                </IconButton>
              </header>

              <ul className="map-selection__info">
                <MapInfoRow
                  icon="building"
                  label="Dirección"
                  value={selectedAddress}
                  emptyText="Sin dirección registrada"
                />
                <MapInfoRow
                  icon="user"
                  label="Director/a"
                  value={selected.director}
                  emptyText="Sin director/a registrado"
                />
                <MapInfoRow
                  icon="telefonos"
                  label="Teléfono"
                  value={selectedPhone}
                  href={selectedPhoneHref}
                  emptyText="Sin teléfono registrado"
                />
              </ul>

              <footer className="map-selection__actions">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary btn--sm map-selection__action"
                >
                  Abrir en Google Maps
                  <Icon name="external" size={14} />
                </a>
              </footer>
            </article>
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
