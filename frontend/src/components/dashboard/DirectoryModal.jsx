import React, { useState, useMemo } from 'react';
import {
    X, Search, Phone, ChevronRight, Layers, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DirectoryModal = ({ isOpen, onClose, funcionarios }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSub, setSelectedSub] = useState("Todas");
    const [selectedDepto, setSelectedDepto] = useState("Todos");

    // Reiniciar filtros al cerrar
    React.useEffect(() => {
        if (!isOpen) {
            setSearchTerm("");
            setSelectedSub("Todas");
            setSelectedDepto("Todos");
        }
    }, [isOpen]);

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

    const filtered = useMemo(() => {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-[#fcfdfe] w-full max-w-4xl h-[80vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Directorio Telefónico</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionarios e Internos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-50/30">
                    {/* Sidebar Filtros */}
                    <div className="hidden md:flex w-72 border-r border-slate-100 bg-white flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-50">
                            <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Filtrar por Unidad
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                            <button
                                onClick={() => { setSelectedSub("Todas"); setSelectedDepto("Todos"); }}
                                className={`w-full text-left px-4 py-3 rounded-2xl text-[10px] font-black uppercase transition-all mb-2 ${selectedSub === "Todas" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-50"}`}
                            >
                                Todas las Unidades
                            </button>
                            {hierarchy.map(sub => (
                                <div key={sub.name} className="space-y-1">
                                    <button
                                        onClick={() => { setSelectedSub(sub.name); setSelectedDepto("Todos"); }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors ${selectedSub === sub.name ? "text-blue-600 bg-blue-50 font-black" : "text-slate-500 hover:text-slate-800"}`}
                                    >
                                        {sub.name}
                                    </button>
                                    {selectedSub === sub.name && (
                                        <div className="ml-4 border-l border-slate-100 space-y-0.5 pl-2 mb-2">
                                            {sub.deptos.map(depto => (
                                                <button
                                                    key={depto}
                                                    onClick={() => setSelectedDepto(depto)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-tight transition-all ${selectedDepto === depto ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"}`}
                                                >
                                                    {depto}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contenido Principal */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white">
                        {/* Buscador */}
                        <div className="p-4 md:p-6 border-b border-slate-50 flex items-center justify-between bg-white flex-shrink-0">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, cargo o interno..."
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-blue-200 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">
                                    {filtered.length} REGISTROS
                                </span>
                            </div>
                        </div>

                        {/* Lista Compacta */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                            <div className="space-y-1">
                                {filtered.length > 0 ? (
                                    filtered.map((f) => (
                                        <div key={f.id} className="flex items-center justify-between p-3 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 rounded-2xl transition-all group border-b border-slate-50 border-l-4 border-l-transparent hover:border-l-blue-600">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center text-xs font-black uppercase flex-shrink-0">
                                                    {f.nombre_funcionario?.charAt(0)}
                                                </div>
                                                <div className="min-w-0 pr-4">
                                                    <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                                        {f.nombre_funcionario}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-end text-right pr-4 border-r border-slate-100 w-20">
                                                    <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Anexo</span>
                                                    <span className="text-sm font-black text-blue-600 shadow-sm px-2 py-1 bg-blue-50 rounded-lg tracking-tighter tabular-nums leading-none">
                                                        {f.anexo || '---'}
                                                    </span>
                                                </div>
                                                <button className="p-2 text-slate-200 group-hover:text-blue-600 transition-colors hidden md:block">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-20">
                                        <Search className="w-12 h-12 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">No se encontraron<br />funcionarios en esta unidad</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Móvil */}
                <div className="md:hidden p-4 bg-white border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-slate-300 uppercase">Ajuste filtros para refinar búsqueda</p>
                    <span className="text-[10px] font-black text-blue-600">{filtered.length} Resultados</span>
                </div>
            </motion.div>
        </div>
    );
};

export default DirectoryModal;
