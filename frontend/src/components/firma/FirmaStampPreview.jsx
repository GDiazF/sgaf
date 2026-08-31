import React from 'react'
import { Button, Icon } from '@slep/ui'
import {
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  ZOOM_FIT,
} from '../../utils/firmaPreviewZoom'

/**
 * Vista previa de página PDF con recuadro de sello arrastrable (bandeja / laboratorio).
 */
export default function FirmaStampPreview({
  preview,
  page,
  zoom,
  onZoomChange,
  stampStyle,
  onStampPointerDown,
  onStampPointerMove,
  onStampPointerUp,
  disabled = false,
  viewportRef,
  stageRef,
}) {
  if (!preview) return null

  return (
    <div className="firma-stamp-preview">
      <div className="firma-placement-toolbar" role="toolbar" aria-label="Zoom de vista previa">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || zoom <= ZOOM_MIN}
          onClick={() => onZoomChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
          aria-label="Alejar"
        >
          −
        </Button>
        <span className="firma-placement-toolbar__label">{zoom}%</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || zoom >= ZOOM_MAX}
          onClick={() => onZoomChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
          aria-label="Acercar"
        >
          <Icon name="plus" size={14} />
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          disabled={disabled || zoom === ZOOM_FIT}
          onClick={() => onZoomChange(ZOOM_FIT)}
        >
          Ajustar
        </Button>
      </div>
      <div className="firma-placement-viewport" ref={viewportRef}>
        <div
          className="firma-placement-viewport__track"
          style={{ width: `${Math.max(100, zoom)}%` }}
        >
          <div
            className="firma-placement"
            ref={stageRef}
            style={{ width: `${(zoom / Math.max(100, zoom)) * 100}%` }}
          >
            <img
              className="firma-placement__img"
              src={`data:image/png;base64,${preview.image_base64}`}
              alt={`Vista previa página ${page}`}
              draggable={false}
            />
            <div
              className="firma-placement__stamp"
              style={stampStyle}
              onPointerDown={onStampPointerDown}
              onPointerMove={onStampPointerMove}
              onPointerUp={onStampPointerUp}
              onPointerCancel={onStampPointerUp}
              role="button"
              tabIndex={0}
              aria-label="Arrastrar posición del sello"
            >
              Sello
              <br />
              (arrastrar)
            </div>
          </div>
        </div>
      </div>
      <p className="firma-placement__hint">
        Arrastre el recuadro azul o use las esquinas rápidas. Zoom con + / −.
      </p>
    </div>
  )
}
