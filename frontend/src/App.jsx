import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import GlobalDashboard from './pages/dashboard/GlobalDashboard';
import LoansDashboard from './pages/loans/LoansDashboard';
import LoanForm from './pages/loans/LoanForm';
import LoanHistory from './pages/loans/LoanHistory';
import Applicants from './pages/applicants/Applicants';
import Keys from './pages/keys/Keys';
import Establishments from './pages/establishments/Establishments';
import ServicesDashboard from './pages/services/ServicesDashboard';
import Providers from './pages/services/Providers';
import PaymentsDashboard from './pages/services/PaymentsDashboard';
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
import Login from './pages/Login';

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
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<GlobalDashboard />} />
              <Route path="loans" element={<LoansDashboard />} />
              <Route path="loans/new" element={<LoanForm />} />
              <Route path="history" element={<LoanHistory />} />
              <Route path="applicants" element={<Applicants />} />
              <Route path="keys" element={<Keys />} />
              <Route path="establishments" element={<Establishments />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="contracts/:id" element={<ContractDetail />} />
              <Route path="services" element={<ServicesDashboard />} />
              <Route path="services/providers" element={<Providers />} />
              <Route path="services/payments" element={<PaymentsDashboard />} />
              <Route path="services/rc" element={<RecepcionConformeList />} />
              <Route path="services/cdp" element={<CDPManager />} />
              <Route path="services/adquisiciones" element={<FacturasAdquisicionDashboard />} />

              {/* Funcionarios */}
              <Route path="funcionarios" element={<FuncionariosDashboard />} />
              <Route path="funcionarios/list" element={<FuncionariosList />} />
              {/* <Route path="funcionarios/new" element={<FuncionarioForm />} />
              <Route path="funcionarios/edit/:id" element={<FuncionarioForm />} /> */}
              <Route path="funcionarios/subdirecciones" element={<Subdirecciones />} />
              <Route path="funcionarios/departamentos" element={<Departamentos />} />
              <Route path="funcionarios/unidades" element={<Unidades />} />
              <Route path="funcionarios/grupos" element={<Grupos />} />
              {/* Telecomunicaciones */}
              <Route path="telecomunicaciones" element={<AnexosDashboard />} />
              {/* Impresoras */}
              <Route path="impresoras" element={<ImpresorasDashboard />} />
              {/* Vehiculos */}
              <Route path="vehiculos" element={<VehiculosDashboard />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
