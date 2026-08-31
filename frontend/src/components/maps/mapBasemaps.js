const cartoKey = import.meta.env.VITE_CARTO_API_KEY?.trim()

/**
 * Calles con color y sin POIs → Carto Voyager nolabels (requiere API key gratis).
 * Sin key → OpenStreetMap estándar (mismos colores, más etiquetas).
 */
const streetBasemap = cartoKey
  ? {
      label: 'Mapa',
      layers: [
        {
          url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
          subdomains: 'abcd',
          maxZoom: 20,
        },
      ],
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  : {
      label: 'Mapa',
      layers: [
        {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: 'abc',
          maxZoom: 19,
        },
      ],
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }

export const MAP_BASEMAPS = {
  street: streetBasemap,
  satellite: {
    label: 'Satélite',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      },
    ],
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
}

export const MAP_USES_CARTO_STREETS = Boolean(cartoKey)
