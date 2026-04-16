import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
// Funcionarios
import FuncionariosDashboard from './pages/funcionarios/FuncionariosDashboard';
import FuncionariosList from './pages/funcionarios/FuncionariosList';
// import FuncionarioForm from './pages/funcionarios/FuncionarioForm';
import Subdirecciones from './pages/funcionarios/Subdirecciones';
import Departamentos from './pages/funcionarios/Departamentos';
import Unidades from './pages/funcionarios/Unidades';
import Grupos from './pages/funcionarios/Grupos';
import AnexosDashboard from './pages/telecomunicaciones/AnexosDashboard';
import ImpresorasDashboard from './pages/impresoras/ImpresorasDashboard';
// Vehiculos
import VehiculosDashboard from './pages/vehiculos/VehiculosDashboard';
import RemuneracionesDashboard from './pages/tesoreria/Remuneraciones';
import TesoreriaMaintainers from './pages/tesoreria/TesoreriaMaintainers';
import LicitacionesDashboard from './pages/licitaciones/LicitacionesDashboard';
import OCDashboard from './pages/orden_compra/OCDashboard';
import ReservasDashboard from './pages/reservas/ReservasDashboard';
import PublicReservas from './pages/reservas/PublicReservas';
import PersonalTIDashboard from './pages/personal_ti/PersonalTIDashboard';
import ProceduresDashboard from './pages/procedimientos/ProceduresDashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import SessionTimeoutManager from './components/SessionTimeoutManager';

// Admin
import UserManagement from './pages/admin/UserManagement';
import RolesManagement from './pages/admin/RolesManagement';
import AuditLog from './pages/admin/AuditLog';

// Private Route Wrapper
const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">Cargando...</div>;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SessionTimeoutManager />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/reservas-externas" element={<PublicReservas />} />

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

              {/* Contratos y Finanzas */}
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
                <Route path="funcionarios" element={<FuncionariosDashboard />} />
                <Route path="funcionarios/list" element={<FuncionariosList />} />
                <Route path="funcionarios/subdirecciones" element={<Subdirecciones />} />
                <Route path="funcionarios/departamentos" element={<Departamentos />} />
                <Route path="funcionarios/unidades" element={<Unidades />} />
                <Route path="funcionarios/grupos" element={<Grupos />} />
              </Route>

              {/* Telecomunicaciones */}
              <Route element={<ProtectedRoute permission="servicios.view_servicio" />}>
                <Route path="telecomunicaciones" element={<AnexosDashboard />} />
              </Route>

              {/* Impresoras */}
              {/* Impresoras */}
              <Route element={<ProtectedRoute permission="impresoras.view_printer" />}>
                <Route path="impresoras" element={<ImpresorasDashboard />} />
              </Route>

              {/* Vehiculos */}
              <Route element={<ProtectedRoute permission="vehiculos.view_registromensual" />}>
                <Route path="vehiculos" element={<VehiculosDashboard />} />
              </Route>

              {/* Tesorería */}
              <Route element={<ProtectedRoute permission="remuneraciones.view_remuneracion" />}>
                <Route path="tesoreria" element={<RemuneracionesDashboard />} />
              </Route>
              <Route element={<ProtectedRoute permission="remuneraciones.view_mapeobanco" />}>
                <Route path="tesoreria/config" element={<TesoreriaMaintainers />} />
              </Route>

              {/* Otros */}
              <Route element={<ProtectedRoute permission="licitaciones.view_licitacionmp" />}>
                <Route path="licitaciones" element={<LicitacionesDashboard />} />
              </Route>
              <Route element={<ProtectedRoute permission="orden_compra.view_ordencompramp" />}>
                <Route path="orden-compra" element={<OCDashboard />} />
              </Route>
              <Route element={<ProtectedRoute permission="solicitudes_reservas.view_solicitudreserva" />}>
                <Route path="reservas" element={<ReservasDashboard />} />
              </Route>
              <Route element={<ProtectedRoute permission="personal_ti.view_personalti" />}>
                <Route path="personal-ti" element={<PersonalTIDashboard />} />
              </Route>

              <Route path="procedimientos" element={<ProceduresDashboard />} />

              {/* Administración */}
              <Route element={<ProtectedRoute permission="auth.view_group" />}>
                <Route path="admin/users" element={<UserManagement />} />
                <Route path="admin/roles" element={<RolesManagement />} />
                <Route path="admin/audit-log" element={<AuditLog />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
