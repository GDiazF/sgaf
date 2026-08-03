import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal'
import InterestLinksSection from '../../components/dashboard/InterestLinksSection'
import DirectoryModal from '../../components/dashboard/DirectoryModal'
import BenefitHighlights from '../../components/dashboard/BenefitHighlights'
import { PageHeader, Card, CardHeader, Button, Icon } from '@slep/ui'

const SHORTCUTS = [
  {
    id: 'reservas',
    eyebrow: 'Calendario de solicitudes',
    title: 'Gestión reservas',
    icon: 'reservas',
    tone: 'accent',
  },
  {
    id: 'mapa',
    eyebrow: 'Mapa interactivo',
    title: 'Establecimientos',
    icon: 'establecimientos',
    tone: 'success',
  },
  {
    id: 'directorio',
    eyebrow: 'Anexo de funcionarios',
    title: 'Directorio interno',
    icon: 'directorio',
    tone: 'accent',
  },
  {
    id: 'tickets',
    eyebrow: 'Soporte e incidentes',
    title: 'Mesa de ayuda',
    icon: 'help-circle',
    tone: 'accent',
  },
  {
    id: 'procedimientos',
    eyebrow: 'Documentación interna',
    title: 'Procedimientos',
    icon: 'procedimientos',
    tone: 'accent',
  },
  {
    id: 'mercado',
    eyebrow: 'Visor de órdenes de compra',
    title: 'Mercado público',
    icon: 'compras',
    tone: 'success',
  },
]

const GlobalDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [funcionarios, setFuncionarios] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [showMapModal, setShowMapModal] = useState(false)
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [funcRes, estRes] = await Promise.all([
        api.get('funcionarios/', { params: { page_size: 1000 } }),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
      ])
      setFuncionarios(funcRes.data.results || funcRes.data || [])
      const estData = estRes.data.results || estRes.data || []
      setEstablishments(Array.isArray(estData) ? estData : [])
    } catch (e) {
      console.error('Error cargando datos del dashboard', e)
    }
  }

  const firstName = (user?.first_name || 'Usuario').split(' ')[0]

  const handleShortcut = (id) => {
    if (id === 'reservas') navigate('/reservas')
    if (id === 'mapa') setShowMapModal(true)
    if (id === 'directorio') setShowDirectoryModal(true)
    if (id === 'tickets') navigate('/tickets')
    if (id === 'procedimientos') navigate('/procedimientos')
    if (id === 'mercado') navigate('/mercado-publico')
  }

  return (
    <div className="page" data-od-id="dashboard-page">
      <PageHeader
        split
        icon="home"
        title={`Hola, ${firstName}`}
        description="Portal de gestión interna · SLEP Iquique"
        breadcrumbs={[{ label: 'Inicio' }]}
      />

      <div className="page-layout dashboard-layout">
        <div className="page-content dashboard-home">
          <section className="dashboard-shortcuts" aria-label="Accesos frecuentes">
            {SHORTCUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dashboard-shortcut dashboard-shortcut--${item.tone}`}
                onClick={() => handleShortcut(item.id)}
              >
                <span className="dashboard-shortcut__text">
                  <span className="dashboard-shortcut__eyebrow">{item.eyebrow}</span>
                  <span className="dashboard-shortcut__title">{item.title}</span>
                </span>
                <Icon name={item.icon} size={40} className="dashboard-shortcut__icon" />
              </button>
            ))}
          </section>

          <Card data-od-id="novedades" className="dashboard-home__feed">
            <CardHeader
              title="Novedades y beneficios"
              subtitle="Comunicados recientes · máximo 5"
              actions={
                <Button variant="primary" size="sm" onClick={() => navigate('/bienestar')}>
                  Explorar todo
                </Button>
              }
            />
            <div className="card__body dashboard-home__benefits">
              <BenefitHighlights limit={5} />
            </div>
          </Card>
        </div>

        <aside className="page-aside dashboard-aside">
          <InterestLinksSection isSidebar />
        </aside>
      </div>

      <EstablishmentMapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        allEstablishments={establishments}
      />
      <DirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        funcionarios={funcionarios}
      />
    </div>
  )
}

export default GlobalDashboard
