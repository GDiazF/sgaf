import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Modal,
  Badge,
  Button,
  Icon,
  DetailView,
  DetailGrid,
  DetailItem,
  FormSection,
  EmptyState,
} from '@slep/ui'

const markerIcon = L.divIcon({
  className: 'map-marker-icon',
  html: '<div class="map-marker is-active" style="--marker:#1a6f9a"><span></span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

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

const EstablishmentDetailModal = ({
  isOpen,
  onClose,
  establishment,
}) => {
  if (!establishment) return null

  const {
    nombre,
    direccion,
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

  const phones = establishment.telefonos || []
  const principalPhone = phones.find((p) => p.es_principal) || phones[0]
  const otherPhones = phones.filter((p) => p.id !== principalPhone?.id)

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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
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
        <FormSection
          asGrid={false}
          headerExtra={
            <div className="est-detail-view__hero">
              <div className="est-detail-view__logo" aria-hidden="true">
                {logo ? (
                  <img src={logo} alt="" />
                ) : (
                  <Icon name="establecimientos" size={28} />
                )}
              </div>
              <div className="est-detail-view__hero-text">
                <div className="est-detail-view__badges">
                  <Badge variant={activo ? 'success' : 'neutral'} dot>
                    {activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {tipo_nombre ? <Badge variant="accent">{tipo_nombre}</Badge> : null}
                </div>
                <p className="est-detail-view__lead">
                  {direccion || 'Sin dirección registrada'}
                </p>
              </div>
            </div>
          }
        >
          <DetailGrid>
            <DetailItem label="RBD" mono>
              {rbd || '—'}
            </DetailItem>
            <DetailItem label="Tipo">{tipo_nombre || '—'}</DetailItem>
            <DetailItem label="Director/a">{director || '—'}</DetailItem>
            <DetailItem label="Correo institucional">
              {email ? (
                <a href={`mailto:${email}`} className="est-detail-view__link">
                  {email}
                </a>
              ) : (
                '—'
              )}
            </DetailItem>
            <DetailItem label="Correo del director/a">
              {email_director ? (
                <a href={`mailto:${email_director}`} className="est-detail-view__link">
                  {email_director}
                </a>
              ) : (
                '—'
              )}
            </DetailItem>
            <DetailItem label="Teléfono principal">
              {principalPhone ? (
                <>
                  {principalPhone.numero}
                  {principalPhone.etiqueta ? (
                    <span className="est-detail-view__muted">
                      {' '}
                      · {principalPhone.etiqueta}
                    </span>
                  ) : null}
                </>
              ) : (
                '—'
              )}
            </DetailItem>
            <DetailItem label="Ubicación GPS">
              {hasCoordinates ? (
                <span className="mono">
                  {latitud}, {longitud}
                </span>
              ) : (
                'Sin coordenadas'
              )}
            </DetailItem>
            <DetailItem label="Dirección" full>
              {direccion || '—'}
            </DetailItem>
          </DetailGrid>
        </FormSection>

        <FormSection
          title="Ubicación"
          description={
            hasCoordinates
              ? 'Vista previa del establecimiento en el mapa'
              : 'Sin coordenadas GPS registradas'
          }
          asGrid={false}
        >
          <div className="est-detail-view__map">
            {isOpen && hasCoordinates ? (
              <MapContainer
                key={`detail-map-${establishment.id}`}
                center={position}
                zoom={16}
                className="est-detail-view__map-canvas"
                scrollWheelZoom
                dragging
                zoomControl
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={position} icon={markerIcon} />
                <MapReady center={position} />
              </MapContainer>
            ) : (
              <EmptyState
                variant="compact"
                title="Sin mapa disponible"
                description="Registre latitud y longitud al editar el establecimiento."
              />
            )}
          </div>
        </FormSection>

        {otherPhones.length > 0 ? (
          <FormSection
            title="Otros teléfonos"
            description="Números adicionales del establecimiento"
            asGrid={false}
          >
            <ul className="est-detail-view__phones">
              {otherPhones.map((phone) => (
                <li key={phone.id || phone.numero} className="est-detail-view__phone">
                  <Icon name="telefonos" size={16} />
                  <span className="est-detail-view__phone-num">{phone.numero}</span>
                  {phone.etiqueta ? (
                    <span className="est-detail-view__muted">{phone.etiqueta}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </FormSection>
        ) : null}
      </DetailView>
    </Modal>
  )
}

export default EstablishmentDetailModal
