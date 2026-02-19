import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Key, Users, Home, ClipboardList, ChevronDown, ChevronRight, Menu, Building, LogOut, DollarSign, FileText, Phone, Printer, Truck, Cog, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const Layout = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop: Collapsed/Expanded
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile: Open/Closed
    const [isSSGGOpen, setSSGGOpen] = useState(true); // Main SSGG group
    const [activeSubMenu, setActiveSubMenu] = useState(null); // 'services' or 'loans'
    const [isProfileOpen, setIsProfileOpen] = useState(false); // Header profile dropdown
    const [isOnline, setIsOnline] = useState(true); // Backend status
    const profileRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Handle clicks outside profile dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen]);

    // Check backend status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                // Hacemos una petición simple al endpoint de establecimientos que ya está configurado
                // 'api' ya inyecta el token automáticamente si existe
                await api.get('establecimientos/', {
                    params: { limit: 1 }, // Minimizar carga
                    timeout: 5000
                });
                setIsOnline(true);
            } catch (error) {
                // Si el error es 401 sigue estando "En Línea" (el servidor respondió)
                // Si el error es de red o timeout, está "Fuera de Línea"
                if (error.response) {
                    setIsOnline(true); // El servidor respondió (aunque sea con error de auth)
                } else {
                    setIsOnline(false); // No hubo respuesta del servidor
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileMenuOpen(false)}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: sidebarOpen || mobileMenuOpen ? 256 : 0,
                    x: mobileMenuOpen || (sidebarOpen && window.innerWidth >= 768) ? 0 : (window.innerWidth < 768 ? -256 : 0),
                    opacity: sidebarOpen || mobileMenuOpen || window.innerWidth >= 768 ? 1 : 0
                }}
                transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    mass: 0.8
                }}
                className={`
                    fixed md:relative inset-y-0 left-0 z-40 bg-slate-900 text-slate-200 flex flex-col shadow-2xl overflow-hidden h-full
                    ${!mobileMenuOpen && window.innerWidth < 768 ? '-translate-x-full' : ''}
                `}
            >
                <div className="p-4 flex items-center justify-center h-28 overflow-hidden">
                    <motion.div
                        initial={false}
                        animate={{
                            opacity: sidebarOpen || mobileMenuOpen ? 1 : 0,
                            scale: sidebarOpen || mobileMenuOpen ? 1 : 0.8,
                            y: sidebarOpen || mobileMenuOpen ? 0 : -10
                        }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center w-[200px]"
                    >
                        <div className="w-48 h-20 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </motion.div>
                </div>

                <nav className="flex-1 px-3 space-y-1 py-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
                    {/* Section: BASE (Outside SSGG) */}
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Home className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Dashboard
                        </motion.span>
                    </Link>

                    <Link
                        to="/establishments"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/establishments') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Building className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Establecimientos
                        </motion.span>
                    </Link>

                    <Link
                        to="/funcionarios"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/funcionarios') || isActive('/funcionarios/list') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Users className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Personal
                        </motion.span>
                    </Link>

                    <div className="py-2 px-4">
                        <div className="border-t border-slate-700/50" />
                    </div>

                    {/* Main SSGG Submenu */}
                    <div>
                        <button
                            onClick={() => setSSGGOpen(!isSSGGOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${isSSGGOpen ? 'bg-slate-800/40 text-blue-400' : 'text-slate-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Cog className="w-6 h-6 flex-shrink-0" />
                                <motion.span
                                    initial={false}
                                    animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    SSGG
                                </motion.span>
                            </div>
                            <motion.div animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}>
                                {isSSGGOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </motion.div>
                        </button>

                        <AnimatePresence>
                            {isSSGGOpen && (sidebarOpen || mobileMenuOpen) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-3 mt-2 pl-2 border-l border-slate-700/50 ml-6"
                                >

                                    {/* Section: FINANZAS */}
                                    <div className="space-y-0.5">
                                        <div className="px-4 mb-1">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                                Finanzas
                                            </span>
                                        </div>
                                        <Link
                                            to="/contracts"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/contracts') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <FileText className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Contratos</span>
                                        </Link>

                                        <Link
                                            to="/services/providers"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/services/providers') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <Users className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Proveedores</span>
                                        </Link>

                                        <Link
                                            to="/services/adquisiciones"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/services/adquisiciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <DollarSign className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Factura sin OC</span>
                                        </Link>

                                        {/* Collapsible Menu: Servicios */}
                                        <div>
                                            <button
                                                onClick={() => setActiveSubMenu(activeSubMenu === 'services' ? null : 'services')}
                                                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeSubMenu === 'services' || (isActive('/services') || isActive('/services/payments') || isActive('/services/rc') || isActive('/services/cdp')) ? 'text-blue-400' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ClipboardList className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium whitespace-nowrap">Servicios</span>
                                                </div>
                                                {activeSubMenu === 'services' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            </button>

                                            {activeSubMenu === 'services' && (
                                                <div className="pl-6 mt-1 space-y-1 border-l border-slate-700/30 ml-2">
                                                    <Link to="/services" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/services') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Panel Principal
                                                    </Link>
                                                    <Link to="/services/payments" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/services/payments') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Pagos
                                                    </Link>
                                                    <Link to="/services/rc" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/services/rc') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Recepciones
                                                    </Link>
                                                    <Link to="/services/cdp" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/services/cdp') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        CDPs
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section: RECURSOS */}
                                    <div className="space-y-0.5">
                                        <div className="px-4 mb-1">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                                Recursos
                                            </span>
                                        </div>
                                        <Link
                                            to="/telecomunicaciones"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/telecomunicaciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <Phone className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Teléfonos</span>
                                        </Link>

                                        <Link
                                            to="/impresoras"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/impresoras') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <Printer className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Impresoras</span>
                                        </Link>

                                        <Link
                                            to="/vehiculos"
                                            className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/vehiculos') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                        >
                                            <Truck className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium whitespace-nowrap">Vehículos</span>
                                        </Link>

                                        {/* Collapsible Menu: Préstamo Llaves */}
                                        <div>
                                            <button
                                                onClick={() => setActiveSubMenu(activeSubMenu === 'loans' ? null : 'loans')}
                                                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeSubMenu === 'loans' || (isActive('/loans/new') || isActive('/applicants') || isActive('/keys')) ? 'text-blue-400' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Key className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium whitespace-nowrap">Llaves</span>
                                                </div>
                                                {activeSubMenu === 'loans' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            </button>

                                            {activeSubMenu === 'loans' && (
                                                <div className="pl-6 mt-1 space-y-1 border-l border-slate-700/30 ml-2">
                                                    <Link to="/loans" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/loans') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Panel
                                                    </Link>
                                                    <Link to="/loans/new" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/loans/new') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Nuevo Préstamo
                                                    </Link>
                                                    <Link to="/history" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/history') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                                                        Historial
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </nav>

                {/* Sidebar Footer: Server Status */}
                <div className="mt-auto border-t border-slate-800/50 pt-4 mb-4">
                    <div className="flex items-center gap-3 px-4 py-2.5 w-full">
                        <div className={`flex-shrink-0 p-1 rounded-lg transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-red-500/10 text-red-500'}`}>
                            <Activity className={`w-5 h-5 ${isOnline ? 'animate-[pulse_2s_infinite]' : ''}`} />
                        </div>
                        <motion.div
                            initial={false}
                            animate={{
                                opacity: sidebarOpen || mobileMenuOpen ? 1 : 0,
                                x: sidebarOpen || mobileMenuOpen ? 0 : -10
                            }}
                            className="overflow-hidden"
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isOnline ? 'En Línea' : 'Sincronizando'}
                            </span>
                        </motion.div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50 relative w-full">
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 cursor-pointer">
                        {/* Sidebar Toggle (Mobile & Desktop) */}
                        <button
                            onClick={() => {
                                if (window.innerWidth >= 768) {
                                    setSidebarOpen(!sidebarOpen);
                                } else {
                                    setMobileMenuOpen(true);
                                }
                            }}
                            className="relative group p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300"
                        >
                            <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
                                <motion.span
                                    animate={{
                                        rotate: sidebarOpen ? 0 : 0,
                                        y: sidebarOpen ? 0 : 0,
                                        width: sidebarOpen ? "100%" : "60%"
                                    }}
                                    className="h-0.5 bg-slate-600 rounded-full"
                                />
                                <motion.span
                                    animate={{
                                        width: sidebarOpen ? "80%" : "100%"
                                    }}
                                    className="h-0.5 bg-slate-600 rounded-full"
                                />
                                <motion.span
                                    animate={{
                                        width: sidebarOpen ? "100%" : "40%"
                                    }}
                                    className="h-0.5 bg-slate-600 rounded-full"
                                />
                            </div>
                        </button>

                        <div className="flex items-center gap-3">
                            <h1 className="text-lg md:text-xl font-bold text-slate-800">
                                Sistema de Gestión
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative" ref={profileRef}>
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold text-slate-700">{user?.username || 'Administrador'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">SLEP Iquique</span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="relative group transition-transform active:scale-95"
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{user?.username}</p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setIsProfileOpen(false);
                                                logout();
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                        >
                                            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-red-100 transition-colors">
                                                <LogOut className="w-4 h-4" />
                                            </div>
                                            Cerrar Sesión
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 md:px-12 max-w-[1800px] mx-auto">
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
            </main >
        </div >
    );
};

export default Layout;
