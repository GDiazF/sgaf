import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Modal, Button, Field, MultiSelect, EmptyState, Icon } from '@slep/ui'

const MONTHS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

function sortPeriodNames(names) {
  return [...names].sort((a, b) => {
    const [mA, yA] = a.split(' ')
    const [mB, yB] = b.split(' ')
    if (yA !== yB) return yB - yA
    return MONTHS.indexOf(mB) - MONTHS.indexOf(mA)
  })
}

function formatClp(value) {
  return `$${new Intl.NumberFormat('es-CL').format(value || 0)}`
}

export default function ConsolidadoModal({
  open,
  onClose,
  rutas,
  variant = 'ruta',
  esMensualMixto = false,
}) {
  const [selectedPeriodNames, setSelectedPeriodNames] = useState([])

  const availablePeriodNames = useMemo(() => {
    const names = new Set()
    rutas.forEach((r) => {
      r.periodos?.forEach((p) => {
        if (p.nombre_estandarizado) names.add(p.nombre_estandarizado)
      })
    })
    return sortPeriodNames(Array.from(names))
  }, [rutas])

  useEffect(() => {
    if (!open) setSelectedPeriodNames([])
  }, [open])

  const selectedSet = useMemo(() => new Set(selectedPeriodNames), [selectedPeriodNames])

  const consolidatedData = useMemo(() => {
    if (!selectedPeriodNames.length) return []

    const summary = {}

    rutas.forEach((r) => {
      const matching = (r.periodos || []).filter((p) =>
        selectedSet.has(p.nombre_estandarizado),
      )
      if (!matching.length) return

      const provId = r.proveedor || 'sin-prov'
      const provNombre = r.proveedor_nombre || 'PROVEEDOR NO ASIGNADO'

      if (!summary[provId]) {
        summary[provId] = {
          id: provId,
          nombre: provNombre,
          rutasCount: 0,
          diasTotal: 0,
          montoFijo: 0,
          montoVariable: 0,
          montoTotal: 0,
        }
      }

      summary[provId].rutasCount += 1
      matching.forEach((p) => {
        summary[provId].diasTotal += parseFloat(p.dias_trabajados || 0)
        const fijo = Number(p.monto_fijo) || 0
        const variable = Number(p.monto_variable) || 0
        if (esMensualMixto) {
          summary[provId].montoFijo += fijo
          summary[provId].montoVariable += variable
          summary[provId].montoTotal += fijo + variable
        } else {
          summary[provId].montoTotal += parseFloat(p.monto_total || 0)
        }
      })
    })

    return Object.values(summary).sort((a, b) => b.montoTotal - a.montoTotal)
  }, [selectedPeriodNames, selectedSet, rutas, esMensualMixto])

  const orderedSelected = useMemo(
    () => availablePeriodNames.filter((name) => selectedSet.has(name)),
    [availablePeriodNames, selectedSet],
  )

  const handleExportExcel = () => {
    if (!consolidatedData.length || !orderedSelected.length) return

    const lineaLabel = variant === 'establecimiento' ? 'Establecimiento' : 'Ruta'
    const periodOrder = new Map(orderedSelected.map((name, i) => [name, i]))

    const rows = []
    orderedSelected.forEach((periodName) => {
      rutas.forEach((r) => {
        const p = r.periodos?.find((per) => per.nombre_estandarizado === periodName)
        if (!p) return
        if (esMensualMixto) {
          const fijo = Number(p.monto_fijo) || 0
          const variable = Number(p.monto_variable) || 0
          rows.push({
            Periodo: periodName,
            Proveedor: r.proveedor_nombre || 'Sin proveedor',
            [lineaLabel]: r.nombre || '',
            'Monto fijo': fijo,
            'Monto variable': variable,
            'Monto total': fijo + variable,
          })
        } else {
          rows.push({
            Periodo: periodName,
            Proveedor: r.proveedor_nombre || 'Sin proveedor',
            [lineaLabel]: r.nombre || '',
            Días: Number(p.dias_trabajados) || 0,
            Monto: Number(p.monto_total) || 0,
          })
        }
      })
    })

    rows.sort((a, b) => {
      const byPeriod = (periodOrder.get(a.Periodo) ?? 0) - (periodOrder.get(b.Periodo) ?? 0)
      if (byPeriod !== 0) return byPeriod
      const byProv = a.Proveedor.localeCompare(b.Proveedor, 'es')
      if (byProv !== 0) return byProv
      return String(a[lineaLabel]).localeCompare(String(b[lineaLabel]), 'es')
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const range = XLSX.utils.decode_range(ws['!ref'])
    const moneyCols = esMensualMixto ? [3, 4, 5] : [4]
    const numberCols = esMensualMixto ? [] : [3]

    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      numberCols.forEach((c) => {
        const cellRef = XLSX.utils.encode_cell({ r: R, c })
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].t = 'n'
          ws[cellRef].z = '#,##0'
        }
      })
      moneyCols.forEach((c) => {
        const cellRef = XLSX.utils.encode_cell({ r: R, c })
        if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
          ws[cellRef].t = 'n'
          ws[cellRef].z = '"$"#,##0'
        }
      })
    }
    ws['!autofilter'] = { ref: ws['!ref'] }
    ws['!cols'] = esMensualMixto
      ? [{ wch: 18 }, { wch: 36 }, { wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 14 }]
      : [{ wch: 18 }, { wch: 36 }, { wch: 36 }, { wch: 10 }, { wch: 16 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')

    const slug =
      orderedSelected.length === 1
        ? orderedSelected[0].replace(/\s+/g, '_')
        : `${orderedSelected.length}_periodos`
    XLSX.writeFile(wb, `Consolidado_${slug}.xlsx`)
    onClose?.()
  }

  const allSelected =
    availablePeriodNames.length > 0 &&
    selectedPeriodNames.length === availablePeriodNames.length

  const totalFijo = consolidatedData.reduce((acc, curr) => acc + curr.montoFijo, 0)
  const totalVariable = consolidatedData.reduce((acc, curr) => acc + curr.montoVariable, 0)
  const totalMonto = consolidatedData.reduce((acc, curr) => acc + curr.montoTotal, 0)
  const totalDias = consolidatedData.reduce((acc, curr) => acc + curr.diasTotal, 0)
  const totalRutas = consolidatedData.reduce((acc, curr) => acc + curr.rutasCount, 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consolidado de pagos"
      subheader="Resumen financiero por proveedor"
      size="lg"
      className="rutas-detail-modal--wide"
      footer={
        selectedPeriodNames.length > 0 && consolidatedData.length > 0 ? (
          <Button variant="primary" onClick={handleExportExcel}>
            <Icon name="download" size="sm" /> Descargar resumen detallado
          </Button>
        ) : null
      }
    >
      <div className="rutas-detail-consol">
        {availablePeriodNames.length > 0 ? (
          <Field label="Seleccionar periodo" htmlFor="consol-periodo">
            <MultiSelect
              id="consol-periodo"
              value={selectedPeriodNames}
              onChange={setSelectedPeriodNames}
              options={availablePeriodNames}
              placeholder="— Elige uno o más periodos —"
            />
          </Field>
        ) : (
          <EmptyState
            title="Sin periodos"
            description="Aún no hay periodos abiertos para consolidar."
          />
        )}

        {selectedPeriodNames.length > 0 ? (
          <table className="rutas-detail-consol-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th className="is-num">{variant === 'establecimiento' ? 'Líneas' : 'Rutas'}</th>
                {esMensualMixto ? (
                  <>
                    <th className="is-num">Monto fijo</th>
                    <th className="is-num">Monto variable</th>
                    <th className="is-num">Monto total</th>
                  </>
                ) : (
                  <>
                    <th className="is-num">Días</th>
                    <th className="is-num">Monto total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {consolidatedData.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre}</td>
                  <td className="is-num">{d.rutasCount}</td>
                  {esMensualMixto ? (
                    <>
                      <td className="is-num">{formatClp(d.montoFijo)}</td>
                      <td className="is-num">{formatClp(d.montoVariable)}</td>
                      <td className="is-num">{formatClp(d.montoTotal)}</td>
                    </>
                  ) : (
                    <>
                      <td className="is-num">{d.diasTotal}</td>
                      <td className="is-num">{formatClp(d.montoTotal)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  Total general
                  {allSelected
                    ? ''
                    : ` · ${selectedPeriodNames.length} periodo${
                        selectedPeriodNames.length === 1 ? '' : 's'
                      }`}
                </td>
                <td className="is-num">{totalRutas}</td>
                {esMensualMixto ? (
                  <>
                    <td className="is-num">{formatClp(totalFijo)}</td>
                    <td className="is-num">{formatClp(totalVariable)}</td>
                    <td className="is-num">{formatClp(totalMonto)}</td>
                  </>
                ) : (
                  <>
                    <td className="is-num">{totalDias}</td>
                    <td className="is-num">{formatClp(totalMonto)}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        ) : availablePeriodNames.length > 0 ? (
          <EmptyState
            title="Esperando selección"
            description="Marque uno o más periodos para generar el balance."
          />
        ) : null}
      </div>
    </Modal>
  )
}
