import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Key, Users, Home, ClipboardList, ChevronDown, ChevronRight, Menu, Building, LogOut, DollarSign, FileText, Phone, Printer } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [isLoanMenuOpen, setLoanMenuOpen] = useState(false);
    const [isServicesMenuOpen, setServicesMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop: Collapsed/Expanded
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile: Open/Closed

    const isActive = (path) => location.pathname === path;

    // Close mobile menu when route changes
    React.useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
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
                    x: mobileMenuOpen || (sidebarOpen && window.innerWidth >= 768) ? 0 : (window.innerWidth < 768 ? -256 : 0)
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`
                    fixed md:relative inset-y-0 left-0 z-40 bg-slate-900 text-slate-200 flex flex-col shadow-2xl overflow-hidden
                    ${!mobileMenuOpen && window.innerWidth < 768 ? '-translate-x-full' : ''}
                `}
            >
                <div className="p-6 flex items-center justify-center min-w-[256px]">
                    <div className="flex flex-col items-center gap-2 w-full">
                        <div className="p-2 w-60 h-28 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-2 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
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
                        to="/services/providers"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/services/providers') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Users className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Proveedores
                        </motion.span>
                    </Link>

                    <Link
                        to="/contracts"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/contracts') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Contratos / Licitaciones
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
                            Personal / Funcionarios
                        </motion.span>
                    </Link>

                    <Link
                        to="/telecomunicaciones"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/telecomunicaciones') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Phone className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Telecomunicaciones
                        </motion.span>
                    </Link>

                    <Link
                        to="/impresoras"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm ${isActive('/impresoras') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Printer className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="font-medium whitespace-nowrap"
                        >
                            Impresoras
                        </motion.span>
                    </Link>

                    <div className="py-1 px-4">
                        <div className="border-t border-slate-500/50" />
                    </div>

                    {/* Collapsible Menu: Préstamo Llaves */}
                    <div>
                        <button
                            onClick={() => {
                                setLoanMenuOpen(!isLoanMenuOpen);
                                if (!isLoanMenuOpen) setServicesMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${!isLoanMenuOpen && (isActive('/loans/new') || isActive('/applicants') || isActive('/keys')) ? 'bg-slate-800 text-white' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 flex-shrink-0" />
                                <motion.span
                                    initial={false}
                                    animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    Préstamo Llaves
                                </motion.span>
                            </div>
                            <motion.div
                                animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}
                            >
                                {isLoanMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </motion.div>
                        </button>

                        {/* Submenu */}
                        {isLoanMenuOpen && (sidebarOpen || mobileMenuOpen) && (
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

                    <div className="py-1 px-4">
                        <div className="border-t border-slate-500/50" />
                    </div>

                    {/* Collapsible Menu: Servicios */}
                    <div>
                        <button
                            onClick={() => {
                                setServicesMenuOpen(!isServicesMenuOpen);
                                if (!isServicesMenuOpen) setLoanMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white text-sm ${!isServicesMenuOpen && (isActive('/services') || isActive('/services/payments') || isActive('/services/rc') || isActive('/services/cdp')) ? 'bg-slate-800 text-white' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 flex-shrink-0" />
                                <motion.span
                                    initial={false}
                                    animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    Gestión Servicios
                                </motion.span>
                            </div>
                            <motion.div
                                animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0 }}
                            >
                                {isServicesMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </motion.div>
                        </button>

                        {/* Submenu */}
                        {isServicesMenuOpen && (sidebarOpen || mobileMenuOpen) && (
                            <div className="pl-4 mt-1 space-y-1">
                                <Link
                                    to="/services"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <Home className="w-4 h-4" />
                                    Panel Servicios
                                </Link>
                                <Link
                                    to="/services/payments"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services/payments') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Pagos
                                </Link>
                                <Link
                                    to="/services/rc"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services/rc') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <FileText className="w-4 h-4" />
                                    Recepciones Conf.
                                </Link>
                                <Link
                                    to="/services/cdp"
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive('/services/cdp') ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                                >
                                    <FileText className="w-4 h-4" />
                                    Repositorio CDPs
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={logout}
                        className={`w-full flex items-center justify-start px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors gap-3`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen || mobileMenuOpen ? 1 : 0, x: sidebarOpen || mobileMenuOpen ? 0 : -10 }}
                            className="text-sm font-medium whitespace-nowrap"
                        >
                            Cerrar Sesión
                        </motion.span>
                    </button>
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
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate max-w-[200px] md:max-w-none">
                                {isActive('/') ? 'Dashboard' :
                                    isActive('/establishments') ? 'Establecimientos' :
                                        isActive('/loans') ? 'Préstamos' :
                                            isActive('/loans/new') ? 'Nuevo Préstamo' :
                                                isActive('/history') ? 'Historial' :
                                                    isActive('/applicants') ? 'Solicitantes' :
                                                        isActive('/keys') ? 'Llaves' :
                                                            isActive('/contracts') ? 'Contratos / Licitaciones' :
                                                                isActive('/services/rc') ? 'Recepciones Conformes' : 'Sistema'}
                            </h2>
                            <p className="text-xs md:text-sm text-slate-500 hidden md:block">Sistema de Gestión.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-semibold text-slate-700">Administrador</span>
                            <span className="text-xs text-slate-500">SLEP Iquique</span>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
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
            </main>
        </div >
    );
};

export default Layout;
