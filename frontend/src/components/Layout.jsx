import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Key, Users, Home, ClipboardList, ChevronDown, ChevronRight, Menu, Building, LogOut, DollarSign } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const location = useLocation();
    const [isLoanMenuOpen, setLoanMenuOpen] = useState(true);
    const [isServicesMenuOpen, setServicesMenuOpen] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, logout } = useAuth();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
            {/* Sidebar */}
            <aside
                className={`bg-slate-900 text-slate-200 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} shadow-2xl z-20`}
            >
                <div className="p-6 flex items-center justify-center">
                    {sidebarOpen ? (
                        <div className="flex flex-col items-center gap-2 w-full">
                            <div className="bg-white rounded-xl shadow-lg p-3 w-48 h-24 flex items-center justify-center">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-3 space-y-2 py-4">
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Home className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">Dashboard</span>}
                    </Link>

                    <Link
                        to="/establishments"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/establishments') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Building className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">Establecimientos</span>}
                    </Link>

                    {/* Collapsible Menu: Préstamo Llaves */}
                    <div>
                        <button
                            onClick={() => setLoanMenuOpen(!isLoanMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${!isLoanMenuOpen && (isActive('/loans/new') || isActive('/applicants') || isActive('/keys')) ? 'bg-slate-800 text-white' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="font-medium">Préstamo Llaves</span>}
                            </div>
                            {sidebarOpen && (
                                isLoanMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {/* Submenu */}
                        {isLoanMenuOpen && sidebarOpen && (
                            <div className="pl-4 mt-1 space-y-1">
                                <Link
                                    to="/loans"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/loans') || isActive('/keys') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <Home className="w-4 h-4" />
                                    Panel Principal
                                </Link>
                                <Link
                                    to="/loans/new"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/loans/new') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Nuevo Préstamo
                                </Link>
                                <Link
                                    to="/history"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/history') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Historial
                                </Link>
                                <Link
                                    to="/applicants"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/applicants') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <Users className="w-4 h-4" />
                                    Solicitantes
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Menu: Servicios */}
                    <div>
                        <button
                            onClick={() => setServicesMenuOpen(!isServicesMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${!isServicesMenuOpen && (isActive('/services') || isActive('/services/providers')) ? 'bg-slate-800 text-white' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="font-medium">Gestión Servicios</span>}
                            </div>
                            {sidebarOpen && (
                                isServicesMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {/* Submenu */}
                        {isServicesMenuOpen && sidebarOpen && (
                            <div className="pl-4 mt-1 space-y-1">
                                <Link
                                    to="/services"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <Home className="w-4 h-4" />
                                    Panel Servicios
                                </Link>
                                <Link
                                    to="/services/providers"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services/providers') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <Users className="w-4 h-4" />
                                    Proveedores
                                </Link>
                                <Link
                                    to="/services/payments"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services/payments') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Pagos
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={logout}
                        className={`w-full flex items-center ${sidebarOpen ? 'justify-start px-4' : 'justify-center'} py-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors gap-3`}
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 relative">
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {isActive('/') ? 'Dashboard General' :
                                isActive('/establishments') ? 'Gestión de Establecimientos' :
                                    isActive('/loans') ? 'Panel de Préstamos' :
                                        isActive('/loans/new') ? 'Nuevo Préstamo' :
                                            isActive('/history') ? 'Historial de Préstamos' :
                                                isActive('/applicants') ? 'Gestión de Solicitantes' :
                                                    isActive('/keys') ? 'Inventario de Llaves' : 'Sistema de Llaves'}
                        </h2>
                        <p className="text-sm text-slate-500">Bienvenido al sistema de control.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-sm font-semibold text-slate-700">Administrador</span>
                            <span className="text-xs text-slate-500">SLEP Iquique</span>
                        </div>
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full"
                    >
                        <Outlet />
                    </motion.div>
                </div>
            </main>
        </div >
    );
};

export default Layout;
