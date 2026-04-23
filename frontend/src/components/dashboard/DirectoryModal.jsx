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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-4xl h-[75vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
                {/* Header Mas Fino */}
                <div className="p-5 border-b border-slate-50 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Directorio de Contactos</h3>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-1">Funcionarios e Internos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                        <X className="w-5 h-5 text-slate-300" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    {/* Sidebar Filtros Mas Discreto */}
                    <div className="hidden md:flex w-64 border-r border-slate-50 bg-slate-50/20 flex-col overflow-hidden">
                        <div className="p-4">
                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Centros de Costo
                            </h4>
                            <div className="space-y-1">
                                <button
                                    onClick={() => { setSelectedSub("Todas"); setSelectedDepto("Todos"); }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all mb-4 ${selectedSub === "Todas" ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:bg-slate-100"}`}
                                >
                                    Todas las Unidades
                                </button>
                                {hierarchy.map(sub => (
                                    <div key={sub.name} className="space-y-1">
                                        <button
                                            onClick={() => { setSelectedSub(sub.name); setSelectedDepto("Todos"); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${selectedSub === sub.name ? "text-blue-600 bg-blue-50" : "text-slate-500 hover:text-slate-800"}`}
                                        >
                                            {sub.name}
                                        </button>
                                        {selectedSub === sub.name && (
                                            <div className="ml-3 border-l border-slate-100 space-y-0.5 pl-2 mb-3">
                                                {sub.deptos.map(depto => (
                                                    <button
                                                        key={depto}
                                                        onClick={() => setSelectedDepto(depto)}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-semibold transition-all ${selectedDepto === depto ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-600"}`}
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
                    </div>

                    {/* Contenido Principal */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white">
                        {/* Buscador */}
                        <div className="p-4 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, cargo..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden sm:block">
                                    {filtered.length} Funcionarios
                                </span>
                            </div>
                        </div>

                        {/* Lista Contactos (Limpia) */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                            <div className="divide-y divide-slate-50">
                                {filtered.length > 0 ? (
                                    filtered.map((f) => (
                                        <div key={f.id} className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-3 rounded-xl transition-all group">
                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0">
                                                    {f.nombre_funcionario?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-[11px] font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors truncate">
                                                        {f.nombre_funcionario}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase leading-none mb-1">Interno</span>
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg tabular-nums">
                                                        {f.anexo || '---'}
                                                    </span>
                                                </div>
                                                <button className="p-2 text-slate-100 group-hover:text-blue-200 transition-colors">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-30">
                                        <Users className="w-10 h-10 text-slate-200 mb-2" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sin resultados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DirectoryModal;
