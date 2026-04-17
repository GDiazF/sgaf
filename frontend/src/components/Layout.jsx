import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Key, KeyRound, Users, Home, ClipboardList, ChevronDown, ChevronRight, Menu, Building, LogOut, DollarSign, FileText, Phone, Printer, Truck, Cog, Activity, Shield, ShoppingCart, Calendar, FileStack, MonitorSmartphone, Box, Globe, UserCircle2, Settings, History, Info, Bell, Trash2, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import api from '../api';
import UserProfileModal from './auth/UserProfileModal';
import AboutModal from './common/AboutModal';
import { APP_VERSION } from '../version';

const Layout = () => {
    const location = useLocation();
    const { user, logout, checkUserStatus } = useAuth();
    const { can, hasRole } = usePermission();
    const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop: Collapsed/Expanded
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile: Open/Closed
    const [activeMainGroup, setActiveMainGroup] = useState(null); // 'ssgg', 'tesoreria', 'mp'
    const [activeSubMenu, setActiveSubMenu] = useState(null); // 'services' or 'loans'
    const [isProfileOpen, setIsProfileOpen] = useState(false); // Header profile dropdown
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true); // Backend status
    const [pendingReservas, setPendingReservas] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const profileRef = useRef(null);
    const notificationsRef = useRef(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    const isActive = (path) => location.pathname === path;

    // Track window resize for responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            // Si la resolución es menor o igual a 1366px hide sidebar by default
            if (width <= 1366) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        // Initial setup
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close sidebar/mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
        if (windowWidth <= 1366) {
            setSidebarOpen(false);
        }
    }, [location.pathname, windowWidth]);

    // Block scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [mobileMenuOpen]);

    // Handle clicks outside profile dropdown or notifications
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        };
        if (isProfileOpen || isNotificationsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen, isNotificationsOpen]);

    // Update document title based on route
    useEffect(() => {
        const routeTitles = {
            '/': 'Dashboard',
            '/establishments': 'Establecimientos',
            '/funcionarios': 'Funcionarios',
            '/reservas-externas': 'Reservas Externas',
            '/contracts': 'Contratos',
            '/services/providers': 'Proveedores',
            '/services/adquisiciones': 'Factura sin OC',
            '/services': 'Servicios',
            '/services/payments': 'Pagos de Servicios',
            '/services/reporte-consumos': 'Reporte Consumos',
            '/services/rc': 'Recepción Conforme',
            '/services/cdp': 'CDPs',
            '/telecomunicaciones': 'Teléfonos',
            '/impresoras': 'Impresoras',
            '/vehiculos': 'Vehículos',
            '/loans': 'Panel de Activos',
            '/keys': 'Inventario Activos',
            '/tesoreria': 'Tesorería',
            '/orden-compra': 'Visor OC',
            '/licitaciones': 'Visor Licitaciones',
            '/reservas': 'Reservas',
            '/personal-ti': 'Personal TI',
            '/procedimientos': 'Procedimientos',
            '/admin/audit-log': 'Auditoría de Sistema'
        };

        const baseTitle = 'SGAF - SLEP Iquique';
        const pageTitle = routeTitles[location.pathname] || '';
        document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle;
    }, [location.pathname]);

    // Check pending reservations for notifications
    useEffect(() => {
        const canApprove = user?.is_superuser || (user?.user_permissions && user.user_permissions.includes('solicitudes_reservas.change_solicitudreserva'));
        if (!canApprove) return;

        const fetchPending = async () => {
            try {
                const res = await api.get('reservas/solicitudes/', { params: { estado: 'PENDIENTE' } });
                setPendingReservas(res.data.results || res.data || []);
            } catch (error) {
                console.warn('Error fetching pending reservations for notifications');
            }
        };

        fetchPending();
        const interval = setInterval(fetchPending, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [user]);

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
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: sidebarOpen || mobileMenuOpen ? '16rem' : '0',
                    x: mobileMenuOpen || (sidebarOpen && windowWidth >= 768) ? 0 : (windowWidth < 768 ? '-16rem' : 0),
                    opacity: sidebarOpen || mobileMenuOpen || windowWidth >= 768 ? 1 : 0
                }}
                transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    mass: 0.8
                }}
                className={`
                    fixed md:relative inset-y-0 left-0 z-[100] md:z-40 bg-slate-900 text-slate-200 flex flex-col shadow-2xl overflow-hidden h-full
                    ${!mobileMenuOpen && windowWidth < 768 ? '-translate-x-full' : ''}
                `}
            >
                <div className={`p-4 flex items-center justify-center ${windowWidth <= 1366 ? 'h-20' : 'h-28'} overflow-hidden`}>
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

                <nav className="flex-1 px-3 space-y-1 py-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar">
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

                    {can('establecimientos.view_establecimiento') && (
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
                    )}

                    {can('funcionarios.view_funcionario') && (
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
                                Funcionarios
                            </motion.span>
                        </Link>
                    )}

                    {can('solicitudes_reservas.view_solicitudreserva') && (
                        <Link
                            to="/reservas"
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/reservas') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <Calendar className="w-5 h-5 flex-shrink-0" />
                            <motion.span
                                initial={false}
                                animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                className="font-medium whitespace-nowrap"
                            >
                                Reservas
                            </motion.span>
                        </Link>
                    )}

                    <Link
                        to="/procedimientos"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/procedimientos') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <FileStack className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Procedimientos
                        </motion.span>
                    </Link>

                    {(can('establecimientos.view_establecimiento') || can('funcionarios.view_funcionario')) && (
                        <div className="py-2 px-4">
                            <div className="border-t border-slate-700/50" />
                        </div>
                    )}

                    {/* Main SSGG Submenu */}
                    {(can('contratos.view_contrato') || can('servicios.view_proveedor') || can('servicios.view_facturaadquisicion') || can('prestamo_llaves.view_prestamo') || can('impresoras.view_printer') || can('vehiculos.view_registromensual') || can('servicios.view_servicio') || can('servicios.view_registropago') || can('servicios.view_recepcionconforme') || can('servicios.view_cdp')) && (
                        <div>
                            <button
                                onClick={() => {
                                    setActiveMainGroup(activeMainGroup === 'ssgg' ? null : 'ssgg');
                                    setActiveSubMenu(null);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeMainGroup === 'ssgg' ? 'bg-slate-800/40 text-blue-400' : 'text-slate-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Cog className="w-5 h-5 flex-shrink-0" />
                                    <motion.span
                                        initial={false}
                                        animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                        className="font-medium whitespace-nowrap"
                                    >
                                        SSGG
                                    </motion.span>
                                </div>
                                <motion.div animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}>
                                    {activeMainGroup === 'ssgg' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {activeMainGroup === 'ssgg' && (sidebarOpen || mobileMenuOpen) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-3 mt-2 pl-2 border-l border-slate-700/50 ml-6"
                                    >
                                        {/* Section: FINANZAS */}
                                        {(can('contratos.view_contrato') || can('servicios.view_proveedor') || can('servicios.view_facturaadquisicion') || can('servicios.view_servicio') || can('servicios.view_registropago') || can('servicios.view_recepcionconforme') || can('servicios.view_cdp')) && (
                                            <div className="space-y-0.5">
                                                <div className="px-4 mb-1">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Finanzas</span>
                                                </div>
                                                {can('contratos.view_contrato') && (
                                                    <Link to="/contracts" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/contracts') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Contratos</span>
                                                    </Link>
                                                )}
                                                {can('servicios.view_proveedor') && (
                                                    <Link to="/services/providers" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/services/providers') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <Users className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Proveedores</span>
                                                    </Link>
                                                )}
                                                {can('servicios.view_facturaadquisicion') && (
                                                    <Link to="/services/adquisiciones" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/services/adquisiciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Factura sin OC</span>
                                                    </Link>
                                                )}
                                                {/* Servicios Submenu */}
                                                {(can('servicios.view_servicio') || can('servicios.view_registropago') || can('servicios.view_recepcionconforme') || can('servicios.view_cdp')) && (
                                                    <div>
                                                        <button onClick={() => setActiveSubMenu(activeSubMenu === 'services' ? null : 'services')} className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeSubMenu === 'services' || (isActive('/services') || isActive('/services/payments') || isActive('/services/rc') || isActive('/services/cdp')) ? 'text-blue-400' : ''}`}>
                                                            <div className="flex items-center gap-3">
                                                                <ClipboardList className="w-4 h-4 flex-shrink-0" />
                                                                <span className="font-medium whitespace-nowrap">Servicios</span>
                                                            </div>
                                                            {activeSubMenu === 'services' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        </button>
                                                        {activeSubMenu === 'services' && (
                                                            <div className="pl-6 mt-1 space-y-1 border-l border-slate-700/30 ml-2">
                                                                {can('servicios.view_servicio') && <Link to="/services" className={`flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs transition-colors ${isActive('/services') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Panel Principal</Link>}
                                                                {can('servicios.view_registropago') && (
                                                                    <>
                                                                        <Link to="/services/payments" className={`flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs transition-colors ${isActive('/services/payments') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Pagos</Link>
                                                                        <Link to="/services/reporte-consumos" className={`flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs transition-colors ${isActive('/services/reporte-consumos') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Reporte Consumos</Link>
                                                                    </>
                                                                )}
                                                                {can('servicios.view_recepcionconforme') && <Link to="/services/rc" className={`flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs transition-colors ${isActive('/services/rc') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Recepciones</Link>}
                                                                {can('servicios.view_cdp') && <Link to="/services/cdp" className={`flex items-center gap-3 px-4 py-1.5 rounded-lg text-xs transition-colors ${isActive('/services/cdp') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>CDPs</Link>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Section: RECURSOS */}
                                        {(can('impresoras.view_printer') || can('vehiculos.view_registromensual') || can('prestamo_llaves.view_prestamo') || can('prestamo_llaves.view_activo') || can('personal_ti.view_personalti') || can('solicitudes_reservas.view_solicitudreserva')) && (
                                            <div className="space-y-0.5 pt-2">
                                                <div className="px-4 mb-1">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Recursos</span>
                                                </div>
                                                {can('servicios.view_servicio') && (
                                                    <Link to="/telecomunicaciones" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/telecomunicaciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <Phone className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Teléfonos</span>
                                                    </Link>
                                                )}
                                                {can('impresoras.view_printer') && (
                                                    <Link to="/impresoras" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/impresoras') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <Printer className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Impresoras</span>
                                                    </Link>
                                                )}
                                                {can('vehiculos.view_registromensual') && (
                                                    <Link to="/vehiculos" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/vehiculos') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <Truck className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Vehículos</span>
                                                    </Link>
                                                )}

                                                {can('personal_ti.view_personalti') && (
                                                    <Link to="/personal-ti" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/personal-ti') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                        <MonitorSmartphone className="w-4 h-4 flex-shrink-0" />
                                                        <span className="font-medium whitespace-nowrap">Personal TI</span>
                                                    </Link>
                                                )}
                                                {(can('prestamo_llaves.view_prestamo') || can('prestamo_llaves.view_activo')) && (
                                                    <div>
                                                        <button onClick={() => setActiveSubMenu(activeSubMenu === 'loans' ? null : 'loans')} className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeSubMenu === 'loans' || (isActive('/loans') || isActive('/loans/new') || isActive('/history') || isActive('/keys')) ? 'text-blue-400' : ''}`}>
                                                            <div className="flex items-center gap-3">
                                                                <Box className="w-4 h-4 flex-shrink-0" />
                                                                <span className="font-medium whitespace-nowrap">Préstamos</span>
                                                            </div>
                                                            {activeSubMenu === 'loans' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        </button>
                                                        {activeSubMenu === 'loans' && (
                                                            <div className="pl-6 mt-1 space-y-1 border-l border-slate-700/30 ml-2">
                                                                {can('prestamo_llaves.view_activo') && (
                                                                    <Link to="/keys" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/keys') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Inventario Activos</Link>
                                                                )}
                                                                {can('prestamo_llaves.view_prestamo') && (
                                                                    <>
                                                                        <Link to="/loans" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/loans') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Panel Activos</Link>
                                                                        <Link to="/loans/new" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/loans/new') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Nuevo Préstamo</Link>
                                                                        <Link to="/history" className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors ${isActive('/history') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>Historial</Link>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="py-2 px-4">
                        <div className="border-t border-slate-700/50" />
                    </div>

                    {/* Tesorería Submenu */}
                    {can('remuneraciones.view_remuneracion') && (
                        <div>
                            <button
                                onClick={() => {
                                    setActiveMainGroup(activeMainGroup === 'tesoreria' ? null : 'tesoreria');
                                    setActiveSubMenu(null);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeMainGroup === 'tesoreria' ? 'bg-slate-800/40 text-blue-400' : 'text-slate-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 flex-shrink-0" />
                                    <motion.span
                                        initial={false}
                                        animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                        className="font-medium whitespace-nowrap"
                                    >
                                        Tesorería
                                    </motion.span>
                                </div>
                                <motion.div animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}>
                                    {activeMainGroup === 'tesoreria' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {activeMainGroup === 'tesoreria' && (sidebarOpen || mobileMenuOpen) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-3 mt-2 pl-2 border-l border-slate-700/50 ml-6"
                                    >
                                        <div className="space-y-0.5">
                                            <Link
                                                to="/tesoreria"
                                                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/tesoreria') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                            >
                                                <FileText className="w-4 h-4 flex-shrink-0" />
                                                <span className="font-medium whitespace-nowrap">Remuneraciones</span>
                                            </Link>
                                            {can('remuneraciones.view_mapeobanco') && (
                                                <Link
                                                    to="/tesoreria/config"
                                                    className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/tesoreria/config') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                                                >
                                                    <Settings className="w-4 h-4 flex-shrink-0" />
                                                    <span className="font-medium whitespace-nowrap">Configuración</span>
                                                </Link>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="py-2 px-4">
                        <div className="border-t border-slate-700/50" />
                    </div>

                    {/* Mercado Público Submenu */}
                    {(can('orden_compra.view_ordencompramp') || can('licitaciones.view_licitacionmp')) && (
                        <div>
                            <button
                                onClick={() => {
                                    setActiveMainGroup(activeMainGroup === 'mp' ? null : 'mp');
                                    setActiveSubMenu(null);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${activeMainGroup === 'mp' ? 'bg-slate-800/40 text-blue-400' : 'text-slate-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                                    <motion.span
                                        initial={false}
                                        animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                        className="font-medium whitespace-nowrap"
                                    >
                                        Mercado Público
                                    </motion.span>
                                </div>
                                <motion.div animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}>
                                    {activeMainGroup === 'mp' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {activeMainGroup === 'mp' && (sidebarOpen || mobileMenuOpen) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-1 mt-2 pl-2 border-l border-slate-700/50 ml-6"
                                    >
                                        {can('orden_compra.view_ordencompramp') && (
                                            <Link to="/orden-compra" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/orden-compra') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                <FileText className="w-4 h-4 flex-shrink-0" />
                                                <span className="font-medium whitespace-nowrap">Visor OC</span>
                                            </Link>
                                        )}
                                        {can('licitaciones.view_licitacionmp') && (
                                            <Link to="/licitaciones" className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-sm ${isActive('/licitaciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                                                <FileStack className="w-4 h-4 flex-shrink-0" />
                                                <span className="font-medium whitespace-nowrap">Visor Licitaciones</span>
                                            </Link>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </nav >

                {/* Sidebar Footer: Server Status */}
                < div className="mt-auto border-t border-slate-800/50 pt-4 mb-4" >
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
                    <motion.div
                        initial={false}
                        animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}
                        className="px-4 mt-1"
                    >
                        <span className="text-[10px] text-slate-600 font-medium">v{APP_VERSION}</span>
                    </motion.div>
                </div >
            </motion.aside >

            {/* Main Content */}
            < main className="flex-1 overflow-auto bg-slate-50 relative w-full" >
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 cursor-pointer">
                        {/* Sidebar Toggle (Mobile & Desktop) */}
                        <button
                            onClick={() => {
                                if (windowWidth >= 768) {
                                    setSidebarOpen(!sidebarOpen);
                                } else {
                                    setMobileMenuOpen(true);
                                }
                            }}
                            className="relative group p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 md:ml-0 -ml-1"
                        >
                            <div className="w-5 h-5 flex flex-col justify-center items-center gap-1 text-slate-600">
                                <motion.span
                                    animate={{
                                        width: (sidebarOpen || mobileMenuOpen) ? "100%" : "60%",
                                        x: (sidebarOpen || mobileMenuOpen) ? 0 : -2
                                    }}
                                    className="h-0.5 bg-current rounded-full"
                                />
                                <motion.span
                                    animate={{
                                        width: "100%"
                                    }}
                                    className="h-0.5 bg-current rounded-full"
                                />
                                <motion.span
                                    animate={{
                                        width: (sidebarOpen || mobileMenuOpen) ? "100%" : "40%",
                                        x: (sidebarOpen || mobileMenuOpen) ? 0 : -4
                                    }}
                                    className="h-0.5 bg-current rounded-full"
                                />
                            </div>
                        </button>

                        <div className="flex items-center gap-3">
                            <h1 className="text-lg md:text-xl font-bold text-slate-800">
                                Sistema de Gestión
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Profile Section */}
                        <div className="relative flex items-center gap-3" ref={profileRef}>
                            <div className="hidden md:flex flex-col items-end leading-tight">
                                <span className="text-sm font-semibold text-slate-700">
                                    {user?.funcionario_data?.nombre_funcionario || user?.username || 'Cargando...'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {user?.is_superuser ? 'Super Administrador' : (user?.groups?.[0] || 'Usuario Sistema')}
                                </span>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="relative group transition-transform active:scale-95"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow overflow-hidden border-2 border-white">
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            user?.username?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>
                                </button>

                                {/* Profile Dropdown Menu */}
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
                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                    {user?.funcionario_data?.nombre_funcionario || user?.username}
                                                </p>
                                            </div>

                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        setIsProfileOpen(false);
                                                        setIsProfileModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                        <UserCircle2 className="w-4 h-4" />
                                                    </div>
                                                    Mi Perfil
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsProfileOpen(false);
                                                        setIsAboutModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                        <Info className="w-4 h-4" />
                                                    </div>
                                                    Acerca del Sistema
                                                </button>
                                            </div>

                                            {(can('auth.view_group') || user?.is_superuser) && (
                                                <div className="py-1">
                                                    <Link
                                                        to="/admin/users"
                                                        onClick={() => setIsProfileOpen(false)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                            <Users className="w-4 h-4" />
                                                        </div>
                                                        Gestionar Usuarios
                                                    </Link>
                                                    <Link
                                                        to="/admin/roles"
                                                        onClick={() => setIsProfileOpen(false)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                            <Shield className="w-4 h-4" />
                                                        </div>
                                                        Roles y Permisos
                                                    </Link>
                                                    <Link
                                                        to="/admin/audit-log"
                                                        onClick={() => setIsProfileOpen(false)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 font-medium text-sm group"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                                            <History className="w-4 h-4" />
                                                        </div>
                                                        Auditoría de Sistema
                                                    </Link>
                                                </div>
                                            )}

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

                        {/* Notifications Bell */}
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`p-2.5 rounded-xl transition-all duration-300 relative group ${isNotificationsOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <Bell className={`w-5 h-5 ${pendingReservas.length > 0 && !isNotificationsOpen ? 'animate-[bounce_2s_infinite]' : ''}`} />
                                {pendingReservas.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                                )}
                            </button>

                            {/* Notifications Drawer */}
                            <AnimatePresence>
                                {isNotificationsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[60]"
                                    >
                                        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-4 h-4 text-indigo-600" />
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notificaciones</h3>
                                            </div>
                                            {pendingReservas.length > 0 && (
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    {pendingReservas.length} Pendientes
                                                </span>
                                            )}
                                        </div>

                                        <div className="max-h-[70vh] overflow-y-auto p-2 space-y-2">
                                            {pendingReservas.length === 0 ? (
                                                <div className="p-10 text-center space-y-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                                                        <Check className="w-6 h-6 text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-400">Todo al día, no hay reservas pendientes.</p>
                                                </div>
                                            ) : (
                                                pendingReservas.map((res) => (
                                                    <Link
                                                        key={res.id}
                                                        to="/reservas"
                                                        onClick={() => setIsNotificationsOpen(false)}
                                                        className="block p-3 rounded-2xl hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 group"
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                                <Truck className="w-5 h-5" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tighter truncate">{res.titulo || 'Sin título'}</p>
                                                                    <span className="text-[9px] font-bold text-slate-400">{new Date(res.fecha_inicio).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">Por: {res.nombre_funcionario}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 w-full">
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

                <UserProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />

                <AboutModal
                    isOpen={isAboutModalOpen}
                    onClose={() => setIsAboutModalOpen(false)}
                    version={APP_VERSION}
                />
            </main >
        </div >
    );
};

export default Layout;
