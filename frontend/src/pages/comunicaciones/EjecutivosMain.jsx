import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Users, Building2, BarChart3, Settings, LayoutList } from 'lucide-react';
import AdminAsignaciones from './AdminAsignaciones';
import EjecutivoDashboard from './EjecutivosDashboard';
import MonitoreoKPI from './MonitoreoKPI';
import AdminGestionesGlobal from './AdminGestionesGlobal';

const EjecutivosMain = () => {
    const { user } = useAuth();
    // Determinamos el rol: si es superusuario o tiene permisos específicos, es Admin
    const isAdmin = user?.is_superuser || user?.groups?.includes('Administrador Comunicaciones');
    
    const [activeTab, setActiveTab] = useState(isAdmin ? 'kpi' : 'mis_establecimientos');

    return (
        <div className="p-2 md:p-4 space-y-3 mx-auto h-full overflow-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Módulo de Comunicaciones</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión y Seguimiento de Establecimientos</p>
                </div>
            </div>

            {isAdmin && (
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-2xl w-fit flex-wrap">
                    <button
                        onClick={() => setActiveTab('kpi')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'kpi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Monitoreo KPI
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'global' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutList className="w-4 h-4" />
                        Todas las Gestiones
                    </button>
                    <button
                        onClick={() => setActiveTab('asignaciones')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'asignaciones' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings className="w-4 h-4" />
                        Asignaciones
                    </button>
                    <button
                        onClick={() => setActiveTab('mis_establecimientos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'mis_establecimientos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        Mis Establecimientos
                    </button>
                </div>
            )}

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'kpi' && <MonitoreoKPI />}
                {activeTab === 'global' && <AdminGestionesGlobal />}
                {activeTab === 'asignaciones' && <AdminAsignaciones />}
                {activeTab === 'mis_establecimientos' && <EjecutivoDashboard />}
            </motion.div>
        </div>
    );
};

export default EjecutivosMain;
