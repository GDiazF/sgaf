import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, Plus, ShieldCheck,
    RefreshCw, AlertTriangle, Users, BookOpen, ScrollText
} from 'lucide-react';
import api from '../../api';
import BreachTab from './tabs/BreachTab';
import PlanesTab from './tabs/PlanesTab';
import CapacitacionesTab from './tabs/CapacitacionesTab';
import { useAuth } from '../../context/AuthContext';

const CiberseguridadDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('incidentes');
    
    // Check permissions
    const permissions = user?.user_permissions || [];
    const canViewIncidentes = permissions.includes('core.view_breachreport');
    const canViewPlanes = permissions.includes('core.view_ciberseguridadplan');
    const canViewCapacitaciones = permissions.includes('core.view_ciberseguridadcapacitacion');

    useEffect(() => {
        if (!canViewIncidentes && canViewPlanes) setActiveTab('planes');
        else if (!canViewIncidentes && !canViewPlanes && canViewCapacitaciones) setActiveTab('capacitaciones');
    }, [canViewIncidentes, canViewPlanes, canViewCapacitaciones]);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                        Ciberseguridad (Ley 21.663)
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">
                        Centro de Operaciones y Cumplimiento Normativo (CSIRT)
                    </p>
                </div>
                
                {/* Tabs / Navigation */}
                <div className="flex gap-2">
                    {canViewIncidentes && (
                        <button
                            onClick={() => setActiveTab('incidentes')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeTab === 'incidentes' 
                                    ? 'bg-rose-600 text-white shadow-md' 
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Incidentes
                        </button>
                    )}
                    {canViewPlanes && (
                        <button
                            onClick={() => setActiveTab('planes')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeTab === 'planes' 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <ScrollText className="w-4 h-4" />
                            SGSI & Planes
                        </button>
                    )}
                    {canViewCapacitaciones && (
                        <button
                            onClick={() => setActiveTab('capacitaciones')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeTab === 'capacitaciones' 
                                    ? 'bg-emerald-600 text-white shadow-md' 
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Capacitaciones
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
                {activeTab === 'incidentes' && canViewIncidentes && <BreachTab user={user} />}
                {activeTab === 'planes' && canViewPlanes && <PlanesTab user={user} />}
                {activeTab === 'capacitaciones' && canViewCapacitaciones && <CapacitacionesTab user={user} />}
            </div>
        </div>
    );
};

export default CiberseguridadDashboard;
