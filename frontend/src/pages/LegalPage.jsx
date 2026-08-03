import React, { useEffect } from 'react'
import { PageHeader, Card, Icon } from '@slep/ui'

const SECTIONS = [
  {
    icon: 'file',
    tone: 'info',
    title: 'Ley 17.336 sobre Propiedad Intelectual',
    body: 'El Sistema de Gestión Administrativa y Financiera (SGAF) es de uso institucional. Este sistema hace uso de bibliotecas de software de código abierto bajo licencias permisivas (MIT, BSD, Apache 2.0). Todo el código fuente desarrollado específicamente para la institución está protegido por las normativas de propiedad intelectual. Queda prohibida la reproducción no autorizada, distribución o modificación del código fuente sin autorización expresa.',
  },
  {
    icon: 'lock',
    tone: 'success',
    title: 'Ley 21.719 sobre Protección de Datos Personales',
    body: 'La plataforma recopila, procesa y almacena datos personales de funcionarios y proveedores en estricto cumplimiento del principio de licitud y finalidad. Como titular de sus datos, usted puede ejercer sus derechos ARCO a través de los canales institucionales. La información solo se utilizará para los fines administrativos previstos y no será compartida con terceros sin consentimiento explícito.',
  },
  {
    icon: 'shield',
    tone: 'accent',
    title: 'Ley 21.663 Ley Marco sobre Ciberseguridad',
    body: 'El sistema ha sido diseñado integrando controles de ciberseguridad para proteger la confidencialidad, integridad y disponibilidad de la información. Todos los incidentes, vulnerabilidades o anomalías detectadas deben ser reportadas al equipo de TI para su gestión y contención inmediata.',
  },
  {
    icon: 'warning',
    tone: 'danger',
    title: 'Ley 21.459 sobre Delitos Informáticos',
    body: 'Para garantizar la seguridad y trazabilidad, todas las acciones en la plataforma (lectura, creación, modificación o eliminación) quedan registradas en una bitácora de auditoría inalterable que incluye su identidad, dirección IP y dispositivo utilizado. El acceso ilícito, manipulación o sabotaje constituyen delitos penados por la ley.',
  },
]

const LegalPage = () => {
  useEffect(() => {
    document.title = 'Marco Legal | SGAF - SLEP Iquique'
  }, [])

  const year = new Date().getFullYear()

  return (
    <div className="page legal-page" data-od-id="legal-page">
      <PageHeader
        icon="shield"
        title="Marco Legal y Normativo"
        description="Normativa aplicable al uso institucional del SGAF — SLEP Iquique"
      />

      <Card className="legal-page__card">
        <ul className="legal-page__list">
          {SECTIONS.map((section) => (
            <li key={section.title} className="legal-page__item">
              <span
                className={`legal-page__icon legal-page__icon--${section.tone}`}
                aria-hidden
              >
                <Icon name={section.icon} size={20} />
              </span>
              <div className="legal-page__body">
                <h2 className="legal-page__title">{section.title}</h2>
                <p className="legal-page__text">{section.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <p className="legal-page__footer">© {year} SLEP Iquique</p>
    </div>
  )
}

export default LegalPage
