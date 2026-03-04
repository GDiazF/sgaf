import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

/**
 * Route wrapper that checks for a specific permission.
 * If the user lacks the permission, they are redirected to the home page.
 */
const ProtectedRoute = ({ permission, requireSuperuser = false }) => {
    const { user, loading } = useAuth();
    const { can } = usePermission();

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-medium">Verificando acceso...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Superuser check for admin pages
    if (requireSuperuser && !user.is_superuser) {
        return <Navigate to="/" replace />;
    }

    if (permission && !can(permission)) {
        // Redirigir al dashboard si no tiene permiso
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
