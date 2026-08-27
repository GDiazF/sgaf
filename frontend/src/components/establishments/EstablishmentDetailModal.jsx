import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Modal,
  Badge,
  Button,
  Icon,
  DetailView,
  EmptyState,
} from '@slep/ui'
import {
  MapBasemapTileLayer,
  MapBasemapSwitcher,
} from '../maps/MapBasemapLayers'
import { MAP_MARKER_ICONS } from '../maps/mapMarkers'

const markerIcon = MAP_MARKER_ICONS.active

function MapReady({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 16)
  }, [center, map])
  useEffect(() => {
    const a = window.setTimeout(() => map.invalidateSize(), 80)
    const b = window.setTimeout(() => map.invalidateSize(), 320)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [map])
  return null
}

function ContactRow({ icon, label, value, href }) {
  if (!value) return null

  const content = (
    <>
      <span className="est-detail-view__contact-icon" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <span className="est-detail-view__contact-body">
        <span className="est-detail-view__contact-label">{label}</span>
        <span className="est-detail-view__contact-value">{value}</span>
      </span>
    </>
  )

  if (href) {
    return (
      <li className="est-detail-view__contact-item">
        <a
          href={href}
          className="est-detail-view__contact-row est-detail-view__contact-row--link"
        >
          {content}
        </a>
      </li>
    )
  }

  return (
    <li className="est-detail-view__contact-item">
      <div className="est-detail-view__contact-row">{content}</div>
    </li>
  )
}

const EstablishmentDetailModal = ({ isOpen, onClose, establishment }) => {
  const [basemap, setBasemap] = useState('street')

  if (!establishment) return null

  const {
    nombre,
    direccion,
    ciudad,
    latitud,
    longitud,
    director,
    email,
    email_director,
    url_web,
    tipo_nombre,
    logo,
    rbd,
    activo,
  } = establishment

  const phones = [...(establishment.telefonos || [])].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1
    if (!a.es_principal && b.es_principal) return 1
    return 0
  })

  const hasCoordinates =
    latitud && longitud && !Number.isNaN(parseFloat(latitud))
  const position = hasCoordinates
    ? [parseFloat(latitud), parseFloat(longitud)]
    : null

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion || nombre)}`

  const subheader = [rbd ? `RBD ${rbd}` : null, tipo_nombre || null]
    .filter(Boolean)
    .join(' · ')

  const addressLine =
    [direccion, ciudad].filter(Boolean).join(', ') ||
    'Sin dirección registrada'

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="est-detail-modal"
      title={nombre}
      subheader={subheader || 'Detalle del establecimiento'}
      footerClassName="modal__footer--split"
      footer={
        <>
          <div className="modal__footer__start">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cerrar
            </Button>
          </div>
          <div className="modal__footer__end">
            {url_web ? (
              <a
                href={url_web}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--secondary btn--quiet"
              >
                <Icon name="external" size="sm" />
                Sitio web
              </a>
            ) : null}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
            >
              <Icon name="establecimientos" size="sm" />
              Abrir en Maps
            </a>
          </div>
        </>
      }
    >
      <DetailView className="est-detail-view">
        <header className="est-detail-view__hero">
          <div className="est-detail-view__logo" aria-hidden="true">
            {logo ? (
              <img src={logo} alt="" />
            ) : (
              <Icon name="establecimientos" size={28} />
            )}
          </div>
          <div className="est-detail-view__hero-body">
            <div className="est-detail-view__meta">
              <Badge variant={activo ? 'success' : 'neutral'} dot>
                {activo ? 'Activo' : 'Inactivo'}
              </Badge>
              {rbd ? (
                <span className="est-detail-view__chip est-detail-view__chip--mono">
                  RBD {rbd}
                </span>
              ) : null}
              {tipo_nombre ? (
                <span className="est-detail-view__chip">{tipo_nombre}</span>
              ) : null}
            </div>
            <p className="est-detail-view__address">
              <Icon name="establecimientos" size={14} />
              {addressLine}
            </p>
          </div>
        </header>

        <div className="est-detail-view__layout">
          <div className="est-detail-view__col">
            <section className="est-detail-view__panel">
              <h3 className="est-detail-view__panel-title">
                <Icon name="building" size={14} />
                Identificación
              </h3>
              <dl className="est-detail-view__facts">
                <div className="est-detail-view__fact">
                  <dt>RBD</dt>
                  <dd className="est-detail-view__mono">{rbd || '—'}</dd>
                </div>
                <div className="est-detail-view__fact">
                  <dt>Tipo</dt>
                  <dd>{tipo_nombre || '—'}</dd>
                </div>
                <div className="est-detail-view__fact">
                  <dt>Ciudad</dt>
                  <dd>{ciudad || '—'}</dd>
                </div>
                <div className="est-detail-view__fact est-detail-view__fact--full">
                  <dt>Dirección</dt>
                  <dd>{direccion || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="est-detail-view__panel">
              <h3 className="est-detail-view__panel-title">
                <Icon name="user" size={14} />
                Contacto
              </h3>
              <ul className="est-detail-view__contact-list">
                <ContactRow icon="user" label="Director/a" value={director} />
                {phones.map((phone) => (
                  <ContactRow
                    key={phone.id || phone.numero}
                    icon="telefonos"
                    label={
                      phone.es_principal
                        ? phone.etiqueta
                          ? `Teléfono principal · ${phone.etiqueta}`
                          : 'Teléfono principal'
                        : phone.etiqueta || 'Teléfono'
                    }
                    value={phone.numero}
                    href={`tel:${phone.numero.replace(/\s/g, '')}`}
                  />
                ))}
                <ContactRow
                  icon="message"
                  label="Correo institucional"
                  value={email}
                  href={email ? `mailto:${email}` : undefined}
                />
                <ContactRow
                  icon="message"
                  label="Correo director/a"
                  value={email_director}
                  href={
                    email_director ? `mailto:${email_director}` : undefined
                  }
                />
              </ul>
            </section>
          </div>

          <aside className="est-detail-view__aside">
            <div className="est-detail-view__map-card">
              <div className="est-detail-view__map-head">
                <span className="est-detail-view__map-label">
                  <Icon name="establecimientos" size={14} />
                  Ubicación
                </span>
                {hasCoordinates ? (
                  <span className="est-detail-view__coords-pill est-detail-view__mono">
                    {Number(latitud).toFixed(5)}, {Number(longitud).toFixed(5)}
                  </span>
                ) : null}
              </div>
              <div className="est-detail-view__map">
                {isOpen && hasCoordinates ? (
                  <>
                    <MapContainer
                      key={`detail-map-${establishment.id}`}
                      center={position}
                      zoom={16}
                      className="est-detail-view__map-canvas"
                      scrollWheelZoom
                      dragging
                      zoomControl
                    >
                      <MapBasemapTileLayer basemap={basemap} />
                      <Marker position={position} icon={markerIcon} />
                      <MapReady center={position} />
                    </MapContainer>
                    <MapBasemapSwitcher
                      value={basemap}
                      onChange={setBasemap}
                    />
                  </>
                ) : (
                  <EmptyState
                    variant="compact"
                    title="Sin coordenadas"
                    description="Registre latitud y longitud al editar."
                  />
                )}
              </div>
            </div>
          </aside>
        </div>
      </DetailView>
    </Modal>
  )
}

export default EstablishmentDetailModal
