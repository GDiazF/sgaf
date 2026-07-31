import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import {
  CrudForm,
  FormSection,
  FormStatus,
  FormActions,
  DetailView,
  DetailGrid,
  DetailItem,
} from '../../components/ui/CrudForm.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { Field, Select, Textarea, Input } from '../../components/ui/Field.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

export function CrudPage() {
  const { showToast } = useToast()

  return (
    <>
      <ShowcaseHero
        title="Formularios CRUD normados"
        description={
          <>
            Patrones reutilizables para crear, editar y ver detalle de registros. Componentes:{' '}
            <code>.crud-form</code>, <code>.form-section</code>, <code>.form-actions</code>,{' '}
            <code>.detail-view</code>, <code>.form-status</code>.
          </>
        }
      />

      <ShowcaseBlock title="Patrones de acción" rule="Variante fija por acción — no improvisar por pantalla">
        <table className="action-map">
          <thead>
            <tr>
              <th>Acción</th>
              <th>Variante</th>
              <th>Ubicación típica</th>
              <th>Desktop</th>
              <th>Móvil</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Guardar / Crear nuevo</td>
              <td>
                <code>btn--primary</code>
              </td>
              <td>Footer formulario / header listado</td>
              <td>Inline derecha</td>
              <td>Ancho completo, primero</td>
            </tr>
            <tr>
              <td>Cancelar / Volver atrás</td>
              <td>
                <code>btn--secondary</code>
              </td>
              <td>Header o footer</td>
              <td>Inline</td>
              <td>Ancho completo</td>
            </tr>
            <tr>
              <td>Exportar / Importar</td>
              <td>
                <code>btn--secondary btn--quiet</code>
              </td>
              <td>Header módulo / toolbar</td>
              <td>Header (Importar) o toolbar</td>
              <td>Secundario en header</td>
            </tr>
            <tr>
              <td>Editar</td>
              <td>
                <code>btn--outline</code>
              </td>
              <td>Detalle / fila tabla</td>
              <td>Inline</td>
              <td>Compacto junto a primary</td>
            </tr>
            <tr>
              <td>Eliminar</td>
              <td>
                <code>btn--danger</code>
              </td>
              <td>Footer edición + confirm</td>
              <td>Izquierda footer</td>
              <td>Ancho completo, debajo</td>
            </tr>
            <tr>
              <td>Ver detalle</td>
              <td>
                <code>btn--primary</code> o <code>btn--outline</code>
              </td>
              <td>Fila tabla / card móvil</td>
              <td>Celda acciones</td>
              <td>Primary en card</td>
            </tr>
            <tr>
              <td>Buscar (filtros)</td>
              <td>
                <code>btn--primary</code>
              </td>
              <td>.filters__actions</td>
              <td>Inline</td>
              <td>Ancho completo, arriba</td>
            </tr>
            <tr>
              <td>Limpiar filtros</td>
              <td>
                <code>btn--secondary btn--quiet</code>
              </td>
              <td>.filters__actions</td>
              <td>Inline</td>
              <td>Ancho completo, debajo</td>
            </tr>
          </tbody>
        </table>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Estados del formulario"
        rule=".form-status--info · --success · --warning · --error · --loading"
      >
        <div className="showcase-col" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <FormStatus
            variant="info"
            title="Formulario vacío"
            description="Complete los campos obligatorios marcados con *."
          />
          <FormStatus
            variant="loading"
            title="Guardando registro…"
            description="No cierre esta ventana hasta que termine."
          />
          <FormStatus
            variant="error"
            title="No se pudo guardar"
            description="Revise los campos marcados en rojo e intente nuevamente."
          />
          <FormStatus
            variant="success"
            title="Registro guardado correctamente"
            description="Los cambios ya están disponibles en el listado."
          />
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="formulario-crear"
        title="Formulario crear"
        rule="Modo alta — .crud-form + .form-section + .form-actions--crud"
      >
        <PageHeader
          icon="proveedores"
          title="Registrar proveedor"
          description="Los campos marcados con * son obligatorios."
          breadcrumbs={[
            { label: 'Inicio', href: '#' },
            { label: 'Proveedores', href: '#' },
            { label: 'Nuevo registro' },
          ]}
          split
          actions={
            <Button variant="secondary" size="sm">
              Volver atrás
            </Button>
          }
        />

        <CrudForm
          footer={false}
          onSubmit={() => showToast('Proveedor guardado', { variant: 'success' })}
        >
          <FormSection
            title="Datos generales"
            description="Información fiscal y de contacto"
            actions={
              <FormActions
                crud
                start={null}
                end={
                  <>
                    <Button type="button" variant="secondary">
                      Cancelar
                    </Button>
                    <Button type="submit" variant="primary">
                      Guardar proveedor
                    </Button>
                  </>
                }
              />
            }
          >
            <Field label="Razón social" required>
              <Input placeholder="Ej. Suministros del Norte SpA" />
            </Field>
            <Field label="RUT" required hint="Formato con puntos y guión">
              <Input placeholder="12.345.678-9" />
            </Field>
            <Field label="Rubro">
              <Select defaultValue="">
                <option value="">Seleccionar…</option>
                <option>Tecnología</option>
                <option>Mobiliario</option>
              </Select>
            </Field>
            <Field label="Correo de contacto">
              <Input type="email" placeholder="contacto@empresa.cl" />
            </Field>
            <Field label="Observaciones" className="field--full">
              <Textarea placeholder="Notas internas…" />
            </Field>
            <Field>
              <label className="check">
                <input type="checkbox" className="no-global" defaultChecked /> Proveedor activo
              </label>
            </Field>
          </FormSection>
        </CrudForm>
      </ShowcaseBlock>

      <ShowcaseBlock title="Formulario editar" rule="Modo edición — incluye Eliminar (danger) + confirm dialog">
        <CrudForm
          footer={false}
          onSubmit={() => showToast('Cambios guardados', { variant: 'success' })}
        >
          <FormStatus
            variant="warning"
            title="Registro con cambios sin guardar"
            description="Si abandona la página perderá las modificaciones."
            style={{ marginBottom: 0 }}
          />
          <FormSection
            title="Datos generales"
            description="Última modificación: 12 mar 2026 · gdiaz"
            actions={
              <FormActions
                crud
                start={
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => showToast('Eliminar (demo)', { variant: 'error' })}
                  >
                    Eliminar
                  </Button>
                }
                end={
                  <>
                    <Button type="button" variant="secondary">
                      Cancelar
                    </Button>
                    <Button type="submit" variant="primary">
                      Guardar cambios
                    </Button>
                  </>
                }
              />
            }
          >
            <Field label="Razón social" required>
              <Input defaultValue="Tecnología Educativa SpA" />
            </Field>
            <Field label="RUT" required error="RUT inválido — verifique el dígito verificador">
              <Input className="input--error" defaultValue="76.543" />
            </Field>
            <Field label="Rubro">
              <Select defaultValue="Tecnología">
                <option>Tecnología</option>
                <option>Mobiliario</option>
              </Select>
            </Field>
            <Field label="Documento adjunto" className="field--full">
              <div className="file-input">
                <label className="file-input__button">
                  <Icon name="attach" className="icon" size={16} />
                  Reemplazar archivo
                  <input type="file" accept=".pdf" className="no-global" />
                </label>
                <span className="file-input__name">contrato-2025.pdf</span>
              </div>
            </Field>
          </FormSection>
        </CrudForm>
      </ShowcaseBlock>

      <ShowcaseBlock title="Vista detalle (solo lectura)" rule=".detail-view + .detail-grid + acciones Editar / Volver">
        <DetailView>
          <FormSection
            asGrid={false}
            headerExtra={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 className="form-section__title">Tecnología Educativa SpA</h2>
                  <p className="form-section__desc">Proveedor · Registrado el 4 ene 2024</p>
                </div>
                <Badge variant="success" dot>
                  Activo
                </Badge>
              </div>
            }
            actions={
              <FormActions
                start={<Button variant="secondary">Volver atrás</Button>}
                end={<Button variant="outline">Editar</Button>}
              />
            }
          >
            <DetailGrid>
              <DetailItem label="RUT" mono>
                76.543.210-K
              </DetailItem>
              <DetailItem label="Rubro">Tecnología</DetailItem>
              <DetailItem label="Correo">contacto@tecedu.cl</DetailItem>
              <DetailItem label="Teléfono">+56 9 8765 4321</DetailItem>
              <DetailItem label="Observaciones" full>
                Proveedor habilitado para licitaciones menores a 100 UTM.
              </DetailItem>
            </DetailGrid>
          </FormSection>
        </DetailView>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Responsividad de formularios"
        rule="Desktop 2 cols · Tablet 2 cols · Móvil 1 col + acciones apiladas"
      >
        <div className="showcase-viewport-grid">
          <div className="showcase-viewport showcase-viewport--desktop">
            <div className="showcase-viewport__label">Desktop ≥1024px</div>
            <div className="showcase-viewport__body">
              <p className="showcase-sidebar-demo__hint">
                Grid 2 columnas · acciones inline a la derecha · Eliminar a la izquierda del footer.
              </p>
            </div>
          </div>
          <div className="showcase-viewport showcase-viewport--tablet">
            <div className="showcase-viewport__label">Tablet 768–1023px</div>
            <div className="showcase-viewport__body">
              <p className="showcase-sidebar-demo__hint">
                Mantiene 2 columnas si hay espacio · sin comprimir campos.
              </p>
            </div>
          </div>
          <div className="showcase-viewport showcase-viewport--mobile">
            <div className="showcase-viewport__label">Móvil ≤767px</div>
            <div className="showcase-viewport__body">
              <div className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
                <Field label="Campo A">
                  <Input placeholder="Ancho completo" />
                </Field>
                <Field label="Campo B">
                  <Input placeholder="Ancho completo" />
                </Field>
              </div>
              <FormActions
                crud
                className="form-actions--crud"
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                end={
                  <>
                    <Button type="button" variant="primary">
                      Guardar
                    </Button>
                    <Button type="button" variant="secondary">
                      Cancelar
                    </Button>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock title="Composición real" rule="Pantalla de referencia en el proyecto">
        <a className="btn btn--outline" href="#formulario-crear">
          Abrir formulario-crud.html →
        </a>
      </ShowcaseBlock>
    </>
  )
}
