import React, { useState, useEffect } from 'react';
import {
    Calendar, Users2, Map, Star, Info
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';
import InterestLinksSection from '../../components/dashboard/InterestLinksSection';
import DirectoryModal from '../../components/dashboard/DirectoryModal';

const GlobalDashboard = () => {
    const { user } = useAuth();
    const [funcionarios, setFuncionarios] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);
    const [showDirectoryModal, setShowDirectoryModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [funcRes, estRes] = await Promise.all([
                api.get('funcionarios/', { params: { page_size: 1000 } }),
                api.get('establecimientos/', { params: { page_size: 1000 } })
            ]);
            setFuncionarios(funcRes.data.results || funcRes.data || []);
            const estData = estRes.data.results || estRes.data || [];
            setEstablishments(Array.isArray(estData) ? estData : []);
        } catch (e) {
            console.error("Error cargando datos del dashboard", e);
        }
    };

    const firstName = (user?.first_name || 'Usuario').split(' ')[0];

    return (
        <div className="w-full flex flex-col h-full bg-[#fcfdfe] overflow-hidden font-sans">
            {/* 1. Header Hero */}
            <header className="px-6 md:px-8 pt-6 pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-0.5">Institucional</p>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-none uppercase">
                            Hola, {firstName}
                        </h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sistema Operativo</span>
                    </div>
                </div>
            </header>

            {/* 2. Botones de Acción - Acceso Rápido */}
            <div className="px-6 md:px-8 py-4 flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => window.location.href = '/reservas'}
                    className="h-16 md:h-20 bg-blue-600 rounded-3xl text-white flex items-center justify-between px-6 shadow-lg hover:bg-blue-700 transition-all group overflow-hidden relative"
                >
                    <div className="z-10 text-left">
                        <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5 opacity-70">Acceso</span>
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight">Gestión Reservas</h3>
                    </div>
                    <Calendar className="w-10 md:w-12 h-10 md:h-12 absolute -right-2 opacity-10" />
                </button>

                <button
                    onClick={() => setShowMapModal(true)}
                    className="h-16 md:h-20 bg-white border border-slate-200 rounded-3xl text-slate-800 flex items-center justify-between px-6 shadow-sm hover:border-blue-500 transition-all group relative overflow-hidden"
                >
                    <div className="z-10 text-left">
                        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Mapa</span>
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight">Establecimientos</h3>
                    </div>
                    <Map className="w-10 md:w-12 h-10 md:h-12 absolute -right-2 text-slate-50" />
                </button>

                <button
                    onClick={() => setShowDirectoryModal(true)}
                    className="h-16 md:h-20 bg-white border border-slate-200 rounded-3xl text-slate-800 flex items-center justify-between px-6 shadow-sm hover:border-blue-500 transition-all group relative overflow-hidden"
                >
                    <div className="z-10 text-left">
                        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Contactos</span>
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight">Directorio Interno</h3>
                    </div>
                    <Users2 className="w-10 md:w-12 h-10 md:h-12 absolute -right-2 text-slate-50" />
                </button>
            </div>

            {/* 3. Área Principal: Links de Interés */}
            <div className="flex-1 px-6 md:px-8 pb-8 min-h-0 flex flex-col">
                <div className="flex-1 bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                    <InterestLinksSection />
                </div>
            </div>

            {/* Modales */}
            <EstablishmentMapModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                allEstablishments={establishments}
            />
            <DirectoryModal
                isOpen={showDirectoryModal}
                onClose={() => setShowDirectoryModal(false)}
                funcionarios={funcionarios}
            />
        </div>
    );
};

export default GlobalDashboard;
