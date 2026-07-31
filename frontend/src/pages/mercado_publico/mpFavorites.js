/**
 * Favoritos locales Mercado Público (OC + Licitaciones).
 * Migra el formato legacy `slep_following` (solo licitaciones).
 */

const STORAGE_KEY = 'mp_favorites'
const LEGACY_LICS_KEY = 'slep_following'

const emptyStore = () => ({ oc: [], licitaciones: [] })

export function loadMpFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        oc: Array.isArray(parsed.oc) ? parsed.oc : [],
        licitaciones: Array.isArray(parsed.licitaciones) ? parsed.licitaciones : [],
      }
    }

    const legacy = localStorage.getItem(LEGACY_LICS_KEY)
    if (legacy) {
      const list = JSON.parse(legacy)
      const migrated = {
        oc: [],
        licitaciones: Array.isArray(list) ? list : [],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }
  } catch (e) {
    console.error('mp favorites load', e)
  }
  return emptyStore()
}

export function saveMpFavorites(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  // Mantener legacy en sync por si algo aún lo lee
  try {
    localStorage.setItem(LEGACY_LICS_KEY, JSON.stringify(store.licitaciones || []))
  } catch {
    /* ignore */
  }
}

export function isMpFavorite(store, type, codigo) {
  const list = type === 'oc' ? store.oc : store.licitaciones
  return list.some((item) => item.CodigoExterno === codigo)
}

export function toggleMpFavorite(store, type, item) {
  const key = type === 'oc' ? 'oc' : 'licitaciones'
  const list = store[key] || []
  const code = item.CodigoExterno
  const exists = list.some((f) => f.CodigoExterno === code)
  const nextList = exists
    ? list.filter((f) => f.CodigoExterno !== code)
    : [...list, { ...item, _favType: type }]
  return { ...store, [key]: nextList }
}

export function favoritesCount(store) {
  return (store.oc?.length || 0) + (store.licitaciones?.length || 0)
}
