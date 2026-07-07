import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Building2, BarChart3, Settings, LayoutList, MessageSquare } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { TITLE_ICON_BOX, TAB_ACTIVE, TAB_INACTIVE } from './comunicacionesUi';
import AdminAsignaciones from './AdminAsignaciones';
import EjecutivoDashboard from './EjecutivosDashboard';
import MonitoreoKPI from './MonitoreoKPI';
import AdminGestionesGlobal from './AdminGestionesGlobal';

const EjecutivosMain = () => {
    const { user } = useAuth();
    const { can } = usePermission();
    
    // Determinamos el rol: si es superusuario o tiene el permiso de crear asignaciones, es Admin
    const isAdmin = user?.is_superuser || can('ejecutivos.add_asignacionejecutivo') || user?.groups?.includes('Administrador Comunicaciones');
    
    const [activeTab, setActiveTab] = useState(isAdmin ? 'kpi' : 'mis_establecimientos');

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden">
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={TITLE_ICON_BOX}>
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                            Comunicaciones
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 uppercase select-none">
                            Gestión y Seguimiento de Establecimientos
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Bar Navigation */}
            {isAdmin && (
                <div className="shrink-0 flex items-center border-b border-slate-200 mb-3 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex gap-6 min-w-max md:min-w-0">
                        <button
                            onClick={() => setActiveTab('kpi')}
                            className={`pb-2 text-[10px] uppercase tracking-widest border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 select-none ${activeTab === 'kpi' ? TAB_ACTIVE : TAB_INACTIVE}`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Monitoreo KPI
                        </button>
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`pb-2 text-[10px] uppercase tracking-widest border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 select-none ${activeTab === 'global' ? TAB_ACTIVE : TAB_INACTIVE}`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            Todas las Gestiones
                        </button>
                        <button
                            onClick={() => setActiveTab('asignaciones')}
                            className={`pb-2 text-[10px] uppercase tracking-widest border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 select-none ${activeTab === 'asignaciones' ? TAB_ACTIVE : TAB_INACTIVE}`}
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Asignaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('mis_establecimientos')}
                            className={`pb-2 text-[10px] uppercase tracking-widest border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 select-none ${activeTab === 'mis_establecimientos' ? TAB_ACTIVE : TAB_INACTIVE}`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            Mis Establecimientos
                        </button>
                    </div>
                </div>
            )}

            {/* Scrolling View Container (Zero-Scroll Interno) */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-4 pr-1">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                    {isAdmin && activeTab === 'kpi' && <MonitoreoKPI />}
                    {isAdmin && activeTab === 'global' && <AdminGestionesGlobal />}
                    {isAdmin && activeTab === 'asignaciones' && <AdminAsignaciones />}
                    {(!isAdmin || activeTab === 'mis_establecimientos') && <EjecutivoDashboard />}
                </motion.div>
            </div>
        </div>
    );
};

export default EjecutivosMain;
