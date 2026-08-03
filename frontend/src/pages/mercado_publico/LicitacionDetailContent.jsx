import React from 'react'
import {
  Badge,
  DataTable,
  DetailView,
  DetailGrid,
  DetailItem,
  Icon,
} from '@slep/ui'
import {
  formatDate,
  formatMoney,
  getStatusLabel,
  getStatusVariant,
} from './mpDetailUtils'

const iconLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
}

/**
 * Cuerpo completo del modal de detalle de licitación (búsqueda y favoritos).
 */
export function LicitacionDetailContent({ lic }) {
  if (!lic) return null

  const itemsList =
    lic.Items?.Listado?.length > 0
      ? lic.Items.Listado
      : lic.ListadoItems?.Listado?.length > 0
        ? lic.ListadoItems.Listado
        : []

  const itemsCount =
    lic.Items?.Cantidad ?? (itemsList.length > 0 ? itemsList.length : null)

  return (
    <DetailView>
      <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>Datos del organismo comprador</h3>
      <DetailGrid>
        {[
          { label: 'Unidad', value: lic.Comprador?.NombreUnidad },
          {
            label: 'RUT Unidad',
            value: lic.Comprador?.RutUnidad,
            mono: true,
          },
          { label: 'Dirección', value: lic.Comprador?.DireccionUnidad },
          { label: 'Comuna', value: lic.Comprador?.ComunaUnidad },
          { label: 'Región', value: lic.Comprador?.RegionUnidad },
          { label: 'Organismo', value: lic.Comprador?.NombreOrganismo },
        ]
          .filter((f) => f.value)
          .map((f) => (
            <DetailItem key={f.label} label={f.label} mono={f.mono}>
              {f.value}
            </DetailItem>
          ))}
      </DetailGrid>

      {(lic.Comprador?.NombreUsuario ||
        lic.Comprador?.NombreContacto ||
        lic.Responsables?.ResponsablePago) && (
        <>
          <h3 style={{ margin: '16px 0 8px', fontSize: 13 }}>Responsables</h3>
          <DetailGrid>
            {[
              {
                label: 'Responsable del proceso',
                value: lic.Comprador?.NombreUsuario || lic.Comprador?.NombreContacto,
              },
              {
                label: 'Cargo',
                value: lic.Comprador?.CargoUsuario || lic.Comprador?.CargoContacto,
              },
              {
                label: 'Email',
                value: lic.Comprador?.MailUsuario || lic.Comprador?.MailContacto,
              },
              {
                label: 'Responsable pago',
                value: lic.Responsables?.ResponsablePago,
              },
              {
                label: 'Responsable contrato',
                value: lic.Responsables?.ResponsableContrato,
              },
              {
                label: 'Email contrato',
                value: lic.Responsables?.EmailResponsableContrato,
              },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <DetailItem key={f.label} label={f.label}>
                  {f.value}
                </DetailItem>
              ))}
          </DetailGrid>
        </>
      )}

      <h3 style={{ margin: '16px 0 8px', fontSize: 13 }}>Hitos temporales</h3>
      <DetailGrid>
        {[
          { l: 'Creación MP', d: lic.Fechas?.FechaCreacion },
          {
            l: 'Publicación',
            d: lic.Fechas?.FechaPublicacion || lic.FechaEnvio,
          },
          {
            l: 'Cierre oferta',
            d: lic.Fechas?.FechaCierre || lic.FechaCierre,
          },
          { l: 'Apertura técnica', d: lic.Fechas?.FechaActoAperturaTecnica },
          {
            l: 'Apertura económica',
            d: lic.Fechas?.FechaActoAperturaEconomica,
          },
          { l: 'Adjudicación', d: lic.Fechas?.FechaAdjudicacion },
          {
            l: 'Adjudicación est.',
            d: lic.Fechas?.FechaEstimadaAdjudicacion,
          },
          { l: 'Inicio preguntas', d: lic.Fechas?.FechaInicio },
          { l: 'Final preguntas', d: lic.Fechas?.FechaFinal },
          { l: 'Pub. respuestas', d: lic.Fechas?.FechaPubRespuestas },
          { l: 'Visita a terreno', d: lic.Fechas?.FechaVisitaTerreno },
          {
            l: 'Entrega antecedentes',
            d: lic.Fechas?.FechaEntregaAntecedentes,
          },
        ]
          .filter((h) => h.d)
          .map((h) => (
            <DetailItem key={h.l} label={h.l}>
              {formatDate(h.d)}
            </DetailItem>
          ))}
      </DetailGrid>

      {lic.MontoEstimado > 0 ? (
        <div style={{ marginTop: 16 }}>
          <DetailItem label="Monto estimado" mono>
            $ {formatMoney(lic.MontoEstimado)}
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>
              {lic.Moneda || 'CLP'}
              {lic.TipoPago ? ` · ${lic.TipoPago}` : ''}
            </span>
          </DetailItem>
        </div>
      ) : null}

      {lic.Descripcion ? (
        <div style={{ marginTop: 16 }}>
          <DetailItem label="Descripción general" full>
            {lic.Descripcion}
          </DetailItem>
        </div>
      ) : null}

      {itemsList.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ ...iconLabelStyle, margin: '0 0 8px', fontSize: 13 }}>
            <Icon name="box" size="sm" />
            Productos/servicios
            {itemsCount != null ? ` (${itemsCount})` : ''}
          </h3>
          <DataTable
            columns={[
              {
                key: 'codigo',
                header: 'Código',
                render: (it) => it.CodigoProducto || '—',
              },
              {
                key: 'producto',
                header: 'Producto / servicio',
                className: 'col--primary',
                cardRole: 'title',
                render: (it) => (
                  <div className="contracts-cat">
                    <strong>{it.NombreProducto}</strong>
                    {it.Descripcion ? <span>{it.Descripcion}</span> : null}
                  </div>
                ),
              },
              {
                key: 'cantidad',
                header: 'Cantidad',
                render: (it) => (
                  <>
                    {it.Cantidad}{' '}
                    <span style={{ color: 'var(--muted)' }}>{it.UnidadMedida}</span>
                  </>
                ),
              },
              {
                key: 'categoria',
                header: 'Categoría',
                render: (it) => it.Categoria || '—',
              },
            ]}
            rows={itemsList}
            totalCount={itemsList.length}
            fillViewport={false}
            showFooter={false}
            getRowKey={(row, i) => `${row.CodigoProducto || 'item'}-${i}`}
            emptyTitle="Sin ítems"
            emptyDescription="No hay productos asociados."
          />
        </div>
      ) : null}
    </DetailView>
  )
}

export function LicitacionDetailSubheader({ lic }) {
  if (!lic) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Badge variant="accent">{lic.CodigoExterno}</Badge>
      <Badge variant={getStatusVariant(lic.Estado, lic.CodigoEstado)} dot>
        {getStatusLabel(lic.Estado, lic.CodigoEstado)}
      </Badge>
      {lic._has_full_detail ? <Badge variant="accent">Full</Badge> : null}
      <span style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {lic.Comprador?.NombreOrganismo || lic.OrganismoNombre || '—'}
      </span>
    </div>
  )
}

export function LicitacionResponsableMeta({ lic }) {
  return (
    <span
      style={{
        ...iconLabelStyle,
        fontSize: 12,
        color: 'var(--muted, #94a3b8)',
        marginRight: 'auto',
      }}
    >
      <Icon name="user" size="sm" />
      {lic?.Comprador?.NombreUsuario ||
        lic?.Comprador?.NombreContacto ||
        'Oficina técnica'}
    </span>
  )
}
