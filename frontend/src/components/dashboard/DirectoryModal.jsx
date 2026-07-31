import React, { useState, useMemo, useEffect } from 'react'
import { Modal, Field, Input, EmptyState, Badge } from '@slep/ui'

const DirectoryModal = ({ isOpen, onClose, funcionarios = [] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSub, setSelectedSub] = useState('Todas')
  const [selectedDepto, setSelectedDepto] = useState('Todos')

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedSub('Todas')
      setSelectedDepto('Todos')
    }
  }, [isOpen])

  const hierarchy = useMemo(() => {
    const subs = {}
    funcionarios.forEach((f) => {
      const sName = f.subdireccion_nombre || 'Dirección Ejecutiva'
      const dName = f.departamento_nombre || 'General'
      if (!subs[sName]) subs[sName] = new Set()
      subs[sName].add(dName)
    })
    return Object.keys(subs)
      .sort()
      .map((s) => ({
        name: s,
        deptos: Array.from(subs[s]).sort(),
      }))
  }, [funcionarios])

  const filtered = useMemo(() => {
    let list = funcionarios
    if (selectedSub !== 'Todas') {
      list = list.filter(
        (f) => (f.subdireccion_nombre || 'Dirección Ejecutiva') === selectedSub,
      )
    }
    if (selectedDepto !== 'Todos') {
      list = list.filter(
        (f) => (f.departamento_nombre || 'General') === selectedDepto,
      )
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      list = list.filter(
        (f) =>
          f.nombre_funcionario?.toLowerCase().includes(s) ||
          f.cargo?.toLowerCase().includes(s) ||
          f.anexo?.includes(s),
      )
    }
    return [...list].sort((a, b) =>
      (a.nombre_funcionario || '').localeCompare(b.nombre_funcionario || ''),
    )
  }, [funcionarios, searchTerm, selectedSub, selectedDepto])

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Directorio interno"
      subheader="Anexos de funcionarios por unidad"
      className="modal--shell modal--directory"
    >
      <div className="directory-modal">
        <aside className="directory-modal__aside" aria-label="Filtro por unidad">
          <p className="directory-modal__aside-label">Unidades</p>
          <button
            type="button"
            className={`btn btn--sm directory-modal__nav-btn${selectedSub === 'Todas' ? ' btn--primary' : ' btn--ghost'}`}
            onClick={() => {
              setSelectedSub('Todas')
              setSelectedDepto('Todos')
            }}
          >
            Todas las unidades
          </button>
          {hierarchy.map((sub) => (
            <div key={sub.name}>
              <button
                type="button"
                className={`btn btn--ghost btn--sm directory-modal__nav-btn${selectedSub === sub.name ? ' is-active' : ''}`}
                style={selectedSub === sub.name ? { color: 'var(--accent)' } : undefined}
                onClick={() => {
                  setSelectedSub(sub.name)
                  setSelectedDepto('Todos')
                }}
              >
                {sub.name}
              </button>
              {selectedSub === sub.name ? (
                <div className="directory-modal__depto-list">
                  {sub.deptos.map((depto) => (
                    <button
                      key={depto}
                      type="button"
                      className="btn btn--ghost btn--sm directory-modal__nav-btn"
                      style={{
                        color: selectedDepto === depto ? 'var(--accent)' : 'var(--muted)',
                      }}
                      onClick={() => setSelectedDepto(depto)}
                    >
                      {depto}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </aside>

        <div className="directory-modal__main">
          <div className="directory-modal__toolbar">
            <Field
              label={`Buscar · ${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`}
              htmlFor="dir-search"
            >
              <Input
                id="dir-search"
                type="search"
                placeholder="Nombre, departamento o anexo…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Field>
          </div>

          <div className="directory-modal__list">
            {filtered.length === 0 ? (
              <EmptyState title="Sin resultados" description="Ajuste la búsqueda o el filtro de unidad." />
            ) : (
              <ul className="access-list access-list--attached">
                {filtered.map((f) => (
                  <li key={f.id}>
                    <div className="access-list__item" style={{ cursor: 'default' }}>
                      <span className="avatar avatar--sm" aria-hidden="true">
                        {f.nombre_funcionario?.charAt(0) || '?'}
                      </span>
                      <span className="access-list__body">
                        <span className="access-list__label">{f.nombre_funcionario}</span>
                        <span className="access-list__desc">
                          {f.departamento_nombre || 'Sin departamento'}
                        </span>
                      </span>
                      <Badge variant="accent" className="directory-modal__anexo">
                        {f.anexo || '—'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default DirectoryModal
