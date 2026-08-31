import L from 'leaflet'

export function createMapMarkerIcon(active = false) {
  return L.divIcon({
    className: 'map-marker-icon',
    html: `<div class="map-marker${active ? ' is-active' : ''}"><span></span></div>`,
    iconSize: active ? [32, 32] : [26, 26],
    iconAnchor: active ? [16, 32] : [13, 26],
  })
}

export const MAP_MARKER_ICONS = {
  idle: createMapMarkerIcon(false),
  active: createMapMarkerIcon(true),
}
