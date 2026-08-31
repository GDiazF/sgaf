import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { Field, Input, Select, Textarea, Switch } from '../../components/ui/Field.jsx'
import { MultiSelect } from '../../components/ui/MultiSelect.jsx'
import { CurrencyInput } from '../../components/ui/CurrencyInput.jsx'
import { KmInput } from '../../components/ui/KmInput.jsx'
import { Icon } from '../../icons/Icon.jsx'

export function FormsPage() {
  const [on, setOn] = useState(true)
  const [monto, setMonto] = useState('1250000')
  const [km, setKm] = useState('15480')
  const [periodos, setPeriodos] = useState(['Enero 2026'])

  return (
    <>
      <header className="showcase-hero">
        <Link to="/" className="showcase-link-back">
          ← Volver al playground
        </Link>
        <h1 className="showcase-hero__title">Formularios</h1>
        <p className="showcase-hero__desc">
          Todos los tipos de control con label, hint, placeholder y estados normados. Wrapper:{' '}
          <code>.field</code> + modificadores.
        </p>
      </header>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Tipos de input</h2>
          <p className="showcase-block__rule">
            .input · .select · .textarea · .input-wrap · .multiselect · .file-input · .currency-input · .km-input
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="form-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            <Field label="Input text" hint="Texto de ayuda opcional">
              <Input className="no-global" placeholder="Nombre del establecimiento" />
            </Field>
            <Field label="Input number" required>
              <Input className="no-global" type="number" placeholder="0" />
            </Field>
            <Field
              label="Monto CLP"
              hint="CurrencyInput · value limpio sin puntos"
            >
              <CurrencyInput value={monto} onChange={setMonto} />
            </Field>
            <Field
              label="Kilometraje"
              hint="KmInput · separador de miles sin $"
            >
              <KmInput value={km} onChange={setKm} />
            </Field>
            <Field label="Input date">
              <Input className="no-global" type="date" />
            </Field>
            <Field label="Input datetime">
              <Input className="no-global" type="datetime-local" />
            </Field>
            <Field label="Input search">
              <div className="input-wrap">
                <Icon name="search" className="input-wrap__icon" size={16} />
                <Input className="no-global" type="search" placeholder="Buscar proveedor…" />
              </div>
            </Field>
            <Field label="Select">
              <Select className="no-global" defaultValue="">
                <option value="">Seleccionar…</option>
                <option>Iquique</option>
                <option>Alto Hospicio</option>
              </Select>
            </Field>
            <Field label="Textarea" className="field--full" style={{ gridColumn: '1 / -1' }}>
              <Textarea className="no-global" placeholder="Observaciones internas…" rows={3} />
            </Field>
            <Field label="Select múltiple" htmlFor="form-multiselect">
              <MultiSelect
                id="form-multiselect"
                value={periodos}
                onChange={setPeriodos}
                options={['Enero 2026', 'Febrero 2026', 'Marzo 2026', 'Abril 2026']}
                placeholder="— Elige uno o más —"
              />
            </Field>
            <Field label="File upload" className="field--full" style={{ gridColumn: '1 / -1' }}>
              <div className="file-input">
                <label className="file-input__zone">
                  <input type="file" className="no-global" />
                  <Icon name="upload" size={24} />
                  <span className="file-input__label">Arrastrar archivo o hacer clic</span>
                  <span className="file-input__hint">PDF, DOCX — máx. 10 MB</span>
                </label>
              </div>
            </Field>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Estados de campo — comparación</h2>
          <p className="showcase-block__rule">
            .field--error · .field--success · .field--disabled · .field--readonly · hover/focus en vivo
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-grid showcase-grid--states">
            <div className="showcase-cell">
              <span className="showcase-cell__label">Default</span>
              <Field label="RUT" hint="Formato con puntos y guión">
                <Input className="no-global" placeholder="12.345.678-9" />
              </Field>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Filled</span>
              <Field label="RUT">
                <Input className="no-global" defaultValue="76.543.210-K" />
              </Field>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Error</span>
              <Field label="RUT" error="RUT inválido — verifique el dígito verificador">
                <Input className="no-global input--error" defaultValue="123" />
              </Field>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Success</span>
              <Field label="RUT" success hint="RUT validado correctamente">
                <Input className="no-global input--success" defaultValue="76.543.210-K" />
              </Field>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Disabled</span>
              <Field label="Código interno">
                <Input className="no-global" disabled defaultValue="EST-0042" />
              </Field>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Readonly</span>
              <Field label="Registrado por">
                <Input className="no-global input--readonly" readOnly defaultValue="gdiaz@slepiquique.cl" />
              </Field>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Checkbox, radio y switch</h2>
          <p className="showcase-block__rule">.check · .radio · .switch — estados activo, off y disabled</p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-row demo-row">
            <label className="check">
              <input type="checkbox" className="no-global" defaultChecked /> Activo
            </label>
            <label className="check">
              <input type="checkbox" className="no-global" /> Inactivo
            </label>
            <label className="check is-disabled">
              <input type="checkbox" className="no-global" disabled /> Disabled
            </label>
          </div>
          <div className="showcase-divider" />
          <div className="showcase-row demo-row">
            <label className="radio">
              <input type="radio" name="sf-radio" className="no-global" defaultChecked /> Opción A
            </label>
            <label className="radio">
              <input type="radio" name="sf-radio" className="no-global" /> Opción B
            </label>
            <label className="radio is-disabled">
              <input type="radio" className="no-global" disabled /> Disabled
            </label>
          </div>
          <div className="showcase-divider" />
          <div className="showcase-row demo-row">
            <Switch checked={on} onChange={(e) => setOn(e.target.checked)} label="Notificaciones ON" />
            <Switch checked={!on} onChange={(e) => setOn(!e.target.checked)} label="Notificaciones OFF" />
            <Switch checked={false} disabled label="Disabled" onChange={() => {}} />
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Patrones CRUD y filtros</h2>
          <p className="showcase-block__rule">Vistas dedicadas con composiciones completas</p>
        </div>
        <div className="showcase-block__body showcase-row demo-row">
          <Link to="/crud" className="btn btn--outline">
            Formularios CRUD →
          </Link>
          <Link to="/filters" className="btn btn--outline">
            Filtros reutilizables →
          </Link>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Formulario CRUD — composición rápida</h2>
          <p className="showcase-block__rule">
            .form-grid + .form-section + .form-actions — ver CRUD para el catálogo completo
          </p>
        </div>
        <div className="showcase-block__body">
          <form className="card" onSubmit={(e) => e.preventDefault()}>
            <div className="card__header">
              <h2 className="card__title">Datos del proveedor</h2>
            </div>
            <div className="card__body">
              <div className="form-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                <Field label="Razón social" required>
                  <Input className="no-global" placeholder="Ej. Suministros del Norte SpA" />
                </Field>
                <Field label="RUT" required error="Campo obligatorio con formato válido">
                  <Input className="no-global input--error" defaultValue="123" />
                </Field>
              </div>
            </div>
            <div className="card__footer">
              <Button variant="secondary">Cancelar</Button>
              <Button variant="primary" type="submit">
                Guardar proveedor
              </Button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
