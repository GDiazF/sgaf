import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Modal, Button, Field, Select, EmptyState, Icon } from '@slep/ui'

export default function ConsolidadoModal({ open, onClose, rutas }) {
  const [selectedPeriodName, setSelectedPeriodName] = useState('')

  const availablePeriodNames = useMemo(() => {
    const names = new Set()
    rutas.forEach((r) => {
      r.periodos?.forEach((p) => {
        if (p.nombre_estandarizado) names.add(p.nombre_estandarizado)
      })
    })
    return Array.from(names).sort((a, b) => {
      const months = [
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
      const [mA, yA] = a.split(' ')
      const [mB, yB] = b.split(' ')
      if (yA !== yB) return yB - yA
      return months.indexOf(mB) - months.indexOf(mA)
    })
  }, [rutas])

  const consolidatedData = useMemo(() => {
    if (!selectedPeriodName) return []

    const summary = {}

    rutas.forEach((r) => {
      const p = r.periodos?.find((per) => per.nombre_estandarizado === selectedPeriodName)

      if (p) {
        const provId = r.proveedor || 'sin-prov'
        const provNombre = r.proveedor_nombre || 'PROVEEDOR NO ASIGNADO'

        if (!summary[provId]) {
          summary[provId] = {
            nombre: provNombre,
            rutasCount: 0,
            diasTotal: 0,
            montoTotal: 0,
            rutasNames: [],
          }
        }

        const dias = parseFloat(p.dias_trabajados || 0)
        const monto = parseFloat(p.monto_total || 0)

        summary[provId].rutasCount += 1
        summary[provId].diasTotal += dias
        summary[provId].montoTotal += monto
        summary[provId].rutasNames.push(r.nombre)
      }
    })

    return Object.values(summary).sort((a, b) => b.montoTotal - a.montoTotal)
  }, [selectedPeriodName, rutas])

  const handleExportExcel = () => {
    if (!consolidatedData.length) return

    const rows = []
    let grandTotal = 0

    consolidatedData.forEach((prov) => {
      rows.push({
        'Proveedor / Ruta': prov.nombre.toUpperCase(),
        Días: '',
        'Monto ($)': '',
      })

      rutas.forEach((r) => {
        if (r.proveedor === prov.id || r.proveedor_nombre === prov.nombre) {
          const p = r.periodos?.find((per) => per.nombre_estandarizado === selectedPeriodName)
          if (p) {
            rows.push({
              'Proveedor / Ruta': `   - ${r.nombre}`,
              Días: p.dias_trabajados,
              'Monto ($)': p.monto_total,
            })
          }
        }
      })

      rows.push({
        'Proveedor / Ruta': `TOTAL ${prov.nombre}`,
        Días: prov.diasTotal,
        'Monto ($)': prov.montoTotal,
      })

      rows.push({ 'Proveedor / Ruta': '', Días: '', 'Monto ($)': '' })

      grandTotal += prov.montoTotal
    })

    rows.push({
      'Proveedor / Ruta': 'TOTAL GENERAL CONSOLIDADO',
      Días: '',
      'Monto ($)': grandTotal,
    })

    const ws = XLSX.utils.json_to_sheet(rows)

    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 2 })
      if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
        ws[cellAddress].t = 'n'
        ws[cellAddress].z = '"$"#,##0'
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle de Pagos')
    ws['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 20 }]

    XLSX.writeFile(wb, `Consolidado_Detallado_${selectedPeriodName.replace(' ', '_')}.xlsx`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consolidado de pagos"
      subheader="Resumen financiero por proveedor"
      size="lg"
      className="rutas-detail-modal--wide"
      footer={
        selectedPeriodName && consolidatedData.length > 0 ? (
          <Button variant="primary" onClick={handleExportExcel}>
            <Icon name="download" size="sm" /> Descargar resumen detallado
          </Button>
        ) : null
      }
    >
      <Field label="Seleccionar periodo" htmlFor="consol-periodo">
        <Select
          id="consol-periodo"
          value={selectedPeriodName}
          onChange={(e) => setSelectedPeriodName(e.target.value)}
        >
          <option value="">— Elige un periodo —</option>
          {availablePeriodNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Field>

      {selectedPeriodName ? (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <table className="rutas-detail-consol-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th className="is-num">Rutas</th>
                <th className="is-num">Días</th>
                <th className="is-num">Monto total</th>
              </tr>
            </thead>
            <tbody>
              {consolidatedData.map((d, idx) => (
                <tr key={idx}>
                  <td>{d.nombre}</td>
                  <td className="is-num">{d.rutasCount}</td>
                  <td className="is-num">{d.diasTotal}</td>
                  <td className="is-num">
                    ${new Intl.NumberFormat('es-CL').format(d.montoTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total general</td>
                <td className="is-num">
                  {consolidatedData.reduce((acc, curr) => acc + curr.rutasCount, 0)}
                </td>
                <td className="is-num">
                  {consolidatedData.reduce((acc, curr) => acc + curr.diasTotal, 0)}
                </td>
                <td className="is-num">
                  $
                  {new Intl.NumberFormat('es-CL').format(
                    consolidatedData.reduce((acc, curr) => acc + curr.montoTotal, 0),
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState
            title="Esperando selección"
            description="Elija un periodo para generar el balance financiero."
          />
        </div>
      )}
    </Modal>
  )
}
