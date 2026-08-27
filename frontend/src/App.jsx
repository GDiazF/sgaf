import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from '@slep/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GlobalDashboard from './pages/dashboard/GlobalDashboard';
import LoansDashboard from './pages/loans/LoansDashboard';
import LoanForm from './pages/loans/LoanForm';
import LoanHistory from './pages/loans/LoanHistory';
import Applicants from './pages/applicants/Applicants';
import Assets from './pages/keys/Assets';
import Establishments from './pages/establishments/Establishments';
import ServicesDashboard from './pages/services/ServicesDashboard';
import Providers from './pages/services/Providers';
import PaymentsDashboard from './pages/services/PaymentsDashboard';
import PaymentsReport from './pages/services/PaymentsReport';
import RecepcionConformeList from './pages/services/RecepcionConformeList';
import CDPManager from './pages/services/CDPManager';
import FacturasAdquisicionDashboard from './pages/services/FacturasAdquisicionDashboard';
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';
import PeriodoDetallePage from './pages/contracts/PeriodoDetallePage';
import ServiciosDashboard from './pages/contracts/ServiciosDashboard';
import ServicioDetailPage from './pages/contracts/ServicioDetailPage';
import RutaDetailPage from './pages/contracts/RutaDetailPage';
// Funcionarios
import FuncionariosList from './pages/funcionarios/FuncionariosList';
// import FuncionarioForm from './pages/funcionarios/FuncionarioForm';
import Subdirecciones from './pages/funcionarios/Subdirecciones';
import Departamentos from './pages/funcionarios/Departamentos';
import Unidades from './pages/funcionarios/Unidades';
import Grupos from './pages/funcionarios/Grupos';
import SellosFirma from './pages/funcionarios/SellosFirma';
import AnexosDashboard from './pages/telecomunicaciones/AnexosDashboard';
// Vehiculos
import VehiculosDashboard from './pages/vehiculos/VehiculosDashboard';
import RemuneracionesDashboard from './pages/tesoreria/Remuneraciones';
import MercadoPublicoDashboard from './pages/mercado_publico/MercadoPublicoDashboard';
import ReservasDashboard from './pages/reservas/ReservasDashboard';
import PublicReservas from './pages/reservas/PublicReservas';
import PersonalTIDashboard from './pages/personal_ti/PersonalTIDashboard';
import InsightsDashboard from './pages/insights/InsightsDashboard';
import BienestarDashboard from './pages/bienestar/BienestarDashboard';

import ProceduresDashboard from './pages/procedimientos/ProceduresDashboard';

// Tickets
import TicketsDashboard from './pages/tickets/TicketsDashboard';
import TicketDetail from './pages/tickets/TicketDetail';

// Comunicaciones
import EjecutivosMain from './pages/comunicaciones/EjecutivosMain';
import EstablecimientoGestion from './pages/comunicaciones/EstablecimientoGestion';

import Login from './pages/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import SessionTimeoutManager from './components/SessionTimeoutManager';

// Admin
import UserManagement from './pages/admin/UserManagement';
import RolesManagement from './pages/admin/RolesManagement';
import AuditLog from './pages/admin/AuditLog';
import EmailSettings from './pages/admin/EmailSettings';
import ArcoManagement from './pages/admin/ArcoManagement';
import LoginBackgroundsAdmin from './pages/admin/LoginBackgroundsAdmin';
import CiberseguridadDashboard from './pages/ciberseguridad/CiberseguridadDashboard';
import LegalPage from './pages/LegalPage';
import FirmaPrueba from './pages/firma/FirmaPrueba';
import ValidarDocumento from './pages/firma/ValidarDocumento';
import BandejaFirmas from './pages/firma/BandejaFirmas';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Error caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="app-boot-screen app-boot-screen--error">
          <h1 className="app-boot-screen__title">Algo salió mal</h1>
          <p className="app-boot-screen__desc">{this.state.error?.toString()}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Private Route Wrapper
const PrivateRoute = () => {
  const { user, loading } = useAuth();

  console.log("[PrivateRoute] Rendering. Loading:", loading, "User:", user ? user.username : "null");

  if (loading) return <div className="app-boot-screen">Cargando…</div>;

  if (!user) {
    console.log("[PrivateRoute] No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("[PrivateRoute] User authenticated, rendering Outlet");
  return <Outlet />;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <SessionTimeoutManager />
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
            <Route path="/reservas-externas" element={<PublicReservas />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/validar" element={<ValidarDocumento />} />
            <Route path="/validar/:codigo" element={<ValidarDocumento />} />
            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<GlobalDashboard />} />
                {/* Préstamo de Llaves */}
                <Route element={<ProtectedRoute permission="prestamo_llaves.view_prestamo" />}>
                  <Route path="loans" element={<LoansDashboard />} />
                  <Route path="loans/new" element={<LoanForm />} />
                  <Route path="history" element={<LoanHistory />} />
                </Route>
                <Route element={<ProtectedRoute permission="prestamo_llaves.view_solicitante" />}>
                  <Route path="applicants" element={<Applicants />} />
                </Route>
                <Route element={<ProtectedRoute permission="prestamo_llaves.view_activo" />}>
                  <Route path="keys" element={<Assets />} />
                </Route>
                {/* Establecimientos */}
                <Route element={<ProtectedRoute permission="establecimientos.view_establecimiento" />}>
                  <Route path="establishments" element={<Establishments />} />
                </Route>
                {/* Gestión de Rutas de Transporte */}
                <Route element={<ProtectedRoute permission="contratos.view_rutatransporte" />}>
                  <Route path="contracts/servicios" element={<ServiciosDashboard />} />
                  <Route path="contracts/servicios/:id" element={<ServicioDetailPage />} />
                  <Route path="contracts/ruta/:id" element={<RutaDetailPage />} />
                  <Route path="contracts/periodo/:id" element={<PeriodoDetallePage />} />
                </Route>

                {/* Contratos y Compras */}
                <Route element={<ProtectedRoute permission="contratos.view_contrato" />}>
                  <Route path="contracts" element={<Contracts />} />
                  <Route path="contracts/:id" element={<ContractDetail />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_proveedor" />}>
                  <Route path="services" element={<ServicesDashboard />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_proveedor" />}>
                  <Route path="services/providers" element={<Providers />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_registropago" />}>
                  <Route path="services/payments" element={<PaymentsDashboard />} />
                  <Route path="services/reporte-consumos" element={<PaymentsReport />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_recepcionconforme" />}>
                  <Route path="services/rc" element={<RecepcionConformeList />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_cdp" />}>
                  <Route path="services/cdp" element={<CDPManager />} />
                </Route>
                <Route element={<ProtectedRoute permission="servicios.view_facturaadquisicion" />}>
                  <Route path="services/adquisiciones" element={<FacturasAdquisicionDashboard />} />
                </Route>
                {/* Funcionarios */}
                <Route element={<ProtectedRoute permission="funcionarios.view_funcionario" />}>
                  <Route path="funcionarios" element={<FuncionariosList />} />
                  <Route path="funcionarios/list" element={<Navigate to="/funcionarios" replace />} />
                  <Route path="funcionarios/subdirecciones" element={<Subdirecciones />} />
                  <Route path="funcionarios/departamentos" element={<Departamentos />} />
                  <Route path="funcionarios/unidades" element={<Unidades />} />
                  <Route path="funcionarios/grupos" element={<Grupos />} />
                  <Route path="funcionarios/sellos" element={<SellosFirma />} />
                </Route>
                {/* Telecomunicaciones */}
                <Route element={<ProtectedRoute permission="servicios.view_servicio" />}>
                  <Route path="telecomunicaciones" element={<AnexosDashboard />} />
                </Route>
                {/* Vehiculos */}
                <Route element={<ProtectedRoute permission="vehiculos.view_registromensual" />}>
                  <Route path="vehiculos" element={<VehiculosDashboard />} />
                  <Route path="vehiculos/flota" element={<VehiculosDashboard />} />
                </Route>
                {/* Tesorería */}
                <Route element={<ProtectedRoute permission="remuneraciones.view_remuneracion" />}>
                  <Route path="tesoreria" element={<RemuneracionesDashboard />} />
                  <Route path="tesoreria/config" element={<Navigate to="/tesoreria?tab=config" replace />} />
                </Route>
                {/* Otros */}
                {/* Mercado Público */}
                <Route
                  element={
                    <ProtectedRoute
                      permission={[
                        'orden_compra.view_ordencompramp',
                        'licitaciones.view_licitacionmp',
                      ]}
                    />
                  }
                >
                  <Route path="mercado-publico" element={<MercadoPublicoDashboard />} />
                  <Route path="orden-compra" element={<Navigate to="/mercado-publico?tab=oc" replace />} />
                  <Route
                    path="licitaciones"
                    element={<Navigate to="/mercado-publico?tab=licitaciones" replace />}
                  />
                </Route>
                <Route element={<ProtectedRoute permission={['solicitudes_reservas.view_solicitudreserva', 'solicitudes_reservas.can_view_calendar']} />}>
                  <Route path="reservas" element={<ReservasDashboard />} />
                </Route>
                <Route element={<ProtectedRoute permission="personal_ti.view_personalti" />}>
                  <Route path="personal-ti" element={<PersonalTIDashboard />} />
                </Route>
                <Route element={<ProtectedRoute permission="insights.view_dashboardmetric" />}>
                  <Route path="insights" element={<InsightsDashboard />} />
                </Route>
                <Route element={<ProtectedRoute permission="bienestar.view_beneficio" />}>
                  <Route path="bienestar" element={<BienestarDashboard />} />
                  <Route path="bienestar/muro" element={<Navigate to="/bienestar" replace />} />
                </Route>
                <Route
                  path="bienestar/config"
                  element={<Navigate to="/bienestar?tab=config" replace />}
                />
                <Route path="procedimientos" element={<ProceduresDashboard />} />
                
                {/* Tickets / Mesa de Ayuda */}
                <Route path="tickets" element={<TicketsDashboard />} />
                <Route path="tickets/new" element={<Navigate to="/tickets?nuevo=1" replace />} />
                <Route
                  path="tickets/categories"
                  element={<Navigate to="/tickets?categorias=1" replace />}
                />
                <Route path="tickets/:id" element={<TicketDetail />} />

                {/* Comunicaciones */}
                <Route element={<ProtectedRoute permission={['establecimientos.view_establecimiento', 'ejecutivos.add_gestionestablecimiento', 'ejecutivos.view_gestionestablecimiento']} />}>
                  <Route path="comunicaciones/ejecutivos" element={<EjecutivosMain />} />
                  <Route path="comunicaciones/ejecutivos/gestion/:id" element={<EstablecimientoGestion />} />
                </Route>

                {/* Administración */}
                <Route element={<ProtectedRoute permission="auth.view_group" />}>
                  <Route path="admin/users" element={<UserManagement />} />
                  <Route path="admin/roles" element={<RolesManagement />} />
                  <Route path="admin/audit-log" element={<AuditLog />} />
                  <Route path="admin/arco" element={<ArcoManagement />} />
                  <Route element={<ProtectedRoute permission={['core.view_breachreport', 'core.view_ciberseguridadplan', 'core.view_ciberseguridadcapacitacion']} />}>
                    <Route path="ciberseguridad" element={<CiberseguridadDashboard />} />
                  </Route>
                  <Route path="admin/email-settings" element={<EmailSettings />} />
                  <Route path="admin/personalizacion/login/backgrounds" element={<LoginBackgroundsAdmin />} />
                </Route>

                <Route element={<ProtectedRoute requireFlag="puede_firmar" />}>
                  <Route path="firma" element={<BandejaFirmas />} />
                  <Route path="firma-prueba" element={<FirmaPrueba />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
