import React from 'react'
import { Badge, DataTable, DetailItem, Icon } from '@slep/ui'
import { formatOcMoney } from './mpDetailUtils'

const OC_ITEM_COLUMNS = [
  {
    key: 'producto',
    header: 'Cod. / producto',
    className: 'col--primary',
    cardRole: 'title',
    priority: 1,
    render: (item) => (
      <div className="contracts-cat">
        <strong>{item.CodigoProducto || '—'}</strong>
        <span>{item.NombreProducto || '—'}</span>
        {item.Categoria ? <span>{item.Categoria}</span> : null}
      </div>
    ),
  },
  {
    key: 'cant',
    header: 'Cant.',
    className: 'col--status',
    cardRole: 'status',
    priority: 1,
    render: (item) => (
      <div className="contracts-cat">
        <strong>{item.Cantidad ?? '—'}</strong>
        <span>{item.UnidadMedida || 'Un'}</span>
      </div>
    ),
  },
  {
    key: 'unitario',
    header: 'Unitario',
    className: 'col--tablet-hide',
    cardRole: 'field',
    priority: 3,
    render: (item) => formatOcMoney(item.PrecioNeto),
  },
  {
    key: 'total',
    header: 'Total',
    className: 'col--secondary',
    cardRole: 'subtitle',
    priority: 2,
    render: (item) => formatOcMoney(item.Total),
  },
]

/**
 * Cuerpo completo del modal de detalle de OC (listado y favoritos).
 */
export function OCDetailContent({ oc }) {
  if (!oc) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Badge variant="accent">Ficha OC</Badge>
        {oc.TipoCompraRepresentativo &&
        oc.TipoCompraRepresentativo !== 'No especificado' ? (
          <Badge variant="accent">{oc.TipoCompraRepresentativo}</Badge>
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <DetailItem label="Fecha envío">
          {oc.Fechas?.FechaCreacion?.replace('T', ' ').split('.')[0] || '—'}
        </DetailItem>
        <DetailItem label="Tipo">{oc.Tipo || 'Consignación'}</DetailItem>
        <DetailItem label="Monto total">
          {formatOcMoney(oc.MontoTotal)} {oc.Moneda || 'CLP'}
        </DetailItem>
        <DetailItem label="Condición de pago">
          {oc.CondicionPago || '30 días contra factura'}
        </DetailItem>
        <DetailItem label="Financiamiento">{oc.Financiamiento || 'Fondos propios'}</DetailItem>
      </div>

      <div>
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem' }}>Proveedor</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <DetailItem label="Razón social">{oc.Proveedor?.Nombre || '—'}</DetailItem>
          <DetailItem label="RUT">{oc.Proveedor?.Rut || '—'}</DetailItem>
          {oc.Proveedor?.Contacto ? (
            <DetailItem label="Contacto">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Icon name="user" size="sm" /> {oc.Proveedor.Contacto}
              </span>
            </DetailItem>
          ) : null}
          {oc.Proveedor?.Mail ? (
            <DetailItem label="Correo">{oc.Proveedor.Mail}</DetailItem>
          ) : null}
          {oc.Proveedor?.Fono ? (
            <DetailItem label="Teléfono">{oc.Proveedor.Fono}</DetailItem>
          ) : null}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '0.85rem' }}>
          Descripción / observación
        </h3>
        <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
          {oc.Observacion || oc.Descripcion || 'Sin descripción detallada disponible.'}
        </p>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '0.85rem' }}>Listado de productos / servicios</h3>
          <Badge variant="neutral">{oc.Items?.Cantidad || 0} posiciones</Badge>
        </div>
        <DataTable
          columns={OC_ITEM_COLUMNS}
          rows={oc.Items?.Listado || []}
          totalCount={oc.Items?.Listado?.length || 0}
          emptyTitle="Sin ítems"
          emptyDescription="Esta orden no tiene posiciones publicadas."
          fillViewport={false}
          showFooter={false}
          getRowKey={(row, i) => `${row.CodigoProducto || 'item'}-${i}`}
        />
      </div>
    </div>
  )
}
