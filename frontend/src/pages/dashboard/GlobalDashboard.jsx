import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Building2, X, User2,
    Users2, Map, Mail, Phone, Search, ChevronRight, LayoutGrid, Filter, ArrowRight, Layers, Layout, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';

const GlobalDashboard = () => {
    const { user } = useAuth();
    const [funcionarios, setFuncionarios] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSub, setSelectedSub] = useState("Todas");
    const [selectedDepto, setSelectedDepto] = useState("Todos");
    const [showMapModal, setShowMapModal] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [funcRes, estRes] = await Promise.all([
                api.get('funcionarios/'),
                api.get('establecimientos/', { params: { page_size: 1000 } })
            ]);
            setFuncionarios(funcRes.data.results || funcRes.data || []);
            const estData = estRes.data.results || estRes.data || [];
            setEstablishments(Array.isArray(estData) ? estData : []);
        } catch (e) {
            console.error("Error cargando datos del dashboard", e);
        }
    };

    const currentUserFuncionario = funcionarios.find(f => f.user === user?.id);
    const firstName = (currentUserFuncionario?.nombre_funcionario || user?.first_name || 'Usuario').split(' ')[0];

    const hierarchy = useMemo(() => {
        const subs = {};
        funcionarios.forEach(f => {
            const sName = f.subdireccion_nombre || "Dirección Ejecutiva";
            const dName = f.departamento_nombre || "General";
            if (!subs[sName]) subs[sName] = new Set();
            subs[sName].add(dName);
        });
        return Object.keys(subs).sort().map(s => ({
            name: s,
            deptos: Array.from(subs[s]).sort()
        }));
    }, [funcionarios]);

    const filteredFuncionarios = useMemo(() => {
        let list = funcionarios;
        if (selectedSub !== "Todas") list = list.filter(f => (f.subdireccion_nombre || "Dirección Ejecutiva") === selectedSub);
        if (selectedDepto !== "Todos") list = list.filter(f => (f.departamento_nombre || "General") === selectedDepto);
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            list = list.filter(f =>
                f.nombre_funcionario?.toLowerCase().includes(s) ||
                f.cargo?.toLowerCase().includes(s) ||
                f.anexo?.includes(s)
            );
        }
        return list.sort((a, b) => a.nombre_funcionario.localeCompare(b.nombre_funcionario));
    }, [funcionarios, searchTerm, selectedSub, selectedDepto]);

    return (
        <div className="w-full flex flex-col h-full bg-[#fcfdfe] overflow-hidden font-sans">
            {/* 1. Header Hero (Adaptable) */}
            <header className="px-6 md:px-8 pt-2 pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-0.5">Institucional</p>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-none uppercase">
                            Hola, {firstName}
                        </h1>
                    </div>
                </div>
            </header>

            {/* 2. Botones de Acción (Stack en móvil) */}
            <div className="px-6 md:px-8 py-3 flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                <button onClick={() => window.location.href = '/reservas'} className="h-16 md:h-20 bg-blue-600 rounded-3xl text-white flex items-center justify-between px-6 shadow-lg hover:bg-blue-700 transition-all group overflow-hidden relative">
                    <div className="z-10 text-left">
                        <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5 opacity-70">Acceso</span>
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight">Gestión Reservas</h3>
                    </div>
                    <Calendar className="w-10 md:w-12 h-10 md:h-12 absolute -right-2 opacity-10" />
                </button>
                <button onClick={() => setShowMapModal(true)} className="h-16 md:h-20 bg-white border border-slate-200 rounded-3xl text-slate-800 flex items-center justify-between px-6 shadow-sm hover:border-blue-500 transition-all group relative overflow-hidden">
                    <div className="z-10 text-left">
                        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">Mapa</span>
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight">Establecimientos</h3>
                    </div>
                    <Map className="w-10 md:w-12 h-10 md:h-12 absolute -right-2 text-slate-50" />
                </button>
            </div>

            {/* 3. El Navegador (Sidebar en Desktop, Dropdown en Móvil) */}
            <div className="flex-1 px-6 md:px-8 pb-6 min-h-0 flex flex-col md:flex-row overflow-hidden gap-4">

                {/* Sidebar para Escritorio */}
                <div className="hidden md:flex w-64 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex-col overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-slate-50">
                        <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Layers className="w-3 h-3" /> Estructura
                        </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        <button onClick={() => { setSelectedSub("Todas"); setSelectedDepto("Todos"); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${selectedSub === "Todas" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"}`}>
                            Todas las Unidades
                        </button>
                        {hierarchy.map(sub => (
                            <div key={sub.name} className="mt-2">
                                <button onClick={() => { setSelectedSub(sub.name); setSelectedDepto("Todos"); }} className={`w-full text-left px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase ${selectedSub === sub.name ? "text-blue-600 bg-blue-50/50" : "text-slate-300 hover:text-slate-500"}`}>
                                    {sub.name}
                                </button>
                                {selectedSub === sub.name && (
                                    <div className="ml-4 mt-1 border-l border-slate-50 space-y-0.5">
                                        {sub.deptos.map(depto => (
                                            <button key={depto} onClick={() => setSelectedDepto(depto)} className={`w-full text-left px-3 py-1.5 rounded-lg text-[8.5px] font-semibold tracking-tight transition-all ${selectedDepto === depto ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"}`}>
                                                {depto}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Área de Lista Principal */}
                <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden">

                    {/* Barra de Filtro Móvil */}
                    <div className="md:hidden p-4 border-b border-slate-50 flex items-center justify-between">
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <Filter className="w-3.5 h-3.5" />
                            {selectedSub === "Todas" ? "Todas las Unidades" : selectedDepto !== "Todos" ? selectedDepto : selectedSub}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Buscador Superior */}
                    <div className="px-6 md:px-8 py-4 border-b border-slate-50 flex items-center justify-between">
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Buscar funcionario..."
                                className="w-full pl-8 py-1.5 bg-transparent text-base font-bold text-slate-800 placeholder:text-slate-200 focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden sm:inline">
                            {filteredFuncionarios.length} regs
                        </span>
                    </div>

                    {/* Lista Vertical Compacta */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-2 custom-scrollbar">
                        {filteredFuncionarios.length > 0 ? (
                            filteredFuncionarios.map((f) => (
                                <div key={f.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 -mx-2 px-3 rounded-2xl transition-all group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all text-[9px] font-black uppercase flex-shrink-0">
                                            {f.nombre_funcionario?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[12px] font-bold text-slate-800 leading-none mb-0.5 truncate uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                                {f.nombre_funcionario}
                                            </h4>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{f.cargo || 'Funcionario'}</span>
                                                <span className="text-[8px] text-slate-200 hidden md:inline">•</span>
                                                <span className="text-[8px] font-medium text-slate-300 lowercase truncate hidden md:inline group-hover:text-slate-500">{f.email || f.user_email || '...'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm group-hover:border-blue-200 transition-all">
                                            <Phone className="w-3 h-3 text-blue-500" />
                                            <span className="text-sm font-black text-slate-700 tracking-tighter tabular-nums">{f.anexo || '---'}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-100 group-hover:text-blue-200 hidden sm:block" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 py-10">
                                <Search className="w-12 h-12 mb-2" />
                                <p className="text-[9px] font-bold uppercase">Sin resultados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Filtro para Móvil */}
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] bg-slate-900/60 backdrop-blur-sm md:hidden flex items-end">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full bg-white rounded-t-[2.5rem] p-8 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Filtrar por Unidad</h3>
                                <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="space-y-4">
                                <button onClick={() => { setSelectedSub("Todas"); setSelectedDepto("Todos"); setIsFilterOpen(false); }} className={`w-full p-4 rounded-2xl text-[10px] font-bold uppercase transition-all ${selectedSub === "Todas" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500"}`}>Todas las Unidades</button>
                                {hierarchy.map(sub => (
                                    <div key={sub.name} className="space-y-2">
                                        <button onClick={() => { setSelectedSub(sub.name); setSelectedDepto("Todos"); setIsFilterOpen(false); }} className={`w-full p-4 rounded-2xl text-[10px] font-bold uppercase text-left ${selectedSub === sub.name ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-white border border-slate-100 text-slate-400"}`}>{sub.name}</button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <EstablishmentMapModal isOpen={showMapModal} onClose={() => setShowMapModal(false)} allEstablishments={establishments} />
        </div>
    );
};

export default GlobalDashboard;
