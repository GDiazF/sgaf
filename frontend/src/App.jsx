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
              <Route path="services" element={<ServicesDashboard />} />
              <Route path="services/providers" element={<Providers />} />
              <Route path="services/payments" element={<PaymentsDashboard />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
