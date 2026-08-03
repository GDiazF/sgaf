const fs = require('fs')

const files = [
  'frontend/src/pages/loans/LoansDashboard.jsx',
  'frontend/src/pages/vehiculos/VehiculosDashboard.jsx',
  'frontend/src/pages/loans/LoanForm.jsx',
  'frontend/src/pages/admin/UserManagement.jsx',
  'frontend/src/pages/contracts/Contracts.jsx',
  'frontend/src/components/contracts/rutas/BulkRouteSettingsModal.jsx',
  'frontend/src/pages/tesoreria/TesoreriaMaintainers.jsx',
  'frontend/src/pages/applicants/Applicants.jsx',
  'frontend/src/pages/reservas/ReservasDashboard.jsx',
  'frontend/src/pages/contracts/ServicioDetailPage.jsx',
  'frontend/src/pages/contracts/ContractDetail.jsx',
  'frontend/src/components/contracts/rutas/PeriodoCalendarioModal.jsx',
  'frontend/src/pages/comunicaciones/MonitoreoKPI.jsx',
  'frontend/src/pages/comunicaciones/AdminGestionesGlobal.jsx',
  'frontend/src/pages/insights/InsightsDashboard.jsx',
  'frontend/src/pages/keys/Assets.jsx',
  'frontend/src/pages/admin/RolesManagement.jsx',
  'frontend/src/pages/admin/ArcoManagement.jsx',
  'frontend/src/pages/personal_ti/PersonalTIDashboard.jsx',
  'frontend/src/pages/telecomunicaciones/AnexosDashboard.jsx',
  'frontend/src/components/contracts/rutas/BulkAsistenciaModal.jsx',
  'frontend/src/pages/services/FacturasAdquisicionDashboard.jsx',
  'frontend/src/pages/comunicaciones/AdminAsignaciones.jsx',
  'frontend/src/pages/services/CDPManager.jsx',
  'frontend/src/pages/contracts/ServiciosDashboard.jsx',
  'frontend/src/pages/loans/LoanHistory.jsx',
  'frontend/src/pages/services/RecepcionConformeList.jsx',
  'frontend/src/pages/services/Providers.jsx',
  'frontend/src/components/loans/TransferModal.jsx',
  'frontend/src/pages/services/PaymentsDashboard.jsx',
  'frontend/src/pages/services/ServicesDashboard.jsx',
  'frontend/src/pages/comunicaciones/EjecutivosDashboard.jsx',
  'frontend/src/pages/ciberseguridad/tabs/CapacitacionesTab.jsx',
  'frontend/src/pages/ciberseguridad/tabs/PlanesTab.jsx',
  'frontend/src/pages/ciberseguridad/tabs/BreachTab.jsx',
]

let cleaned = 0
for (const file of files) {
  if (!fs.existsSync(file)) continue
  let src = fs.readFileSync(file, 'utf8')
  const next = src.replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n')
  if (next !== src) {
    fs.writeFileSync(file, next)
    cleaned++
  }
}
console.log('cleaned', cleaned)
