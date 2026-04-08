import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, Check, AlertCircle, User, Building, Trash2, ArrowRight, Key, Filter, Users, Hash, PhoneCall, Shield, LogOut, ChevronDown, ListFilter, Plus, LayoutGrid, X, ChevronRight, Activity, Grid, Layers, MapPin, Zap, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const AnexosDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSection, setActiveSection] = useState('all');
    const [showAsignarModal, setShowAsignarModal] = useState(false);
    const [selectedAnexoNum, setSelectedAnexoNum] = useState('');
    const [funcionarioSearch, setFuncionarioSearch] = useState('');
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [message, setMessage] = useState(null);
    const [collapsedDepts, setCollapsedDepts] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('control-anexos/', {
                params: { search: searchTerm }
            });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            showMessage('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAsignar = async () => {
        if (!selectedFuncionarioId || !selectedAnexoNum) {
            showMessage('Debe seleccionar funcionario y anexo', 'error');
            return;
        }
        try {
            await api.post('control-anexos/asignar/', {
                anexo: selectedAnexoNum,
                funcionario_id: selectedFuncionarioId
            });
            showMessage(`Vínculo establecido con éxito`, 'success');
            setShowAsignarModal(false);
            setSelectedAnexoNum('');
            setSelectedFuncionarioId('');
            setFuncionarioSearch('');
            fetchData();
        } catch (error) {
            showMessage(error.response?.data?.error || 'Error al vincular', 'error');
        }
    };

    const handleLiberar = async (anexo) => {
        if (!window.confirm(`¿Liberar el anexo ${anexo}?`)) return;
        try {
            await api.post('control-anexos/liberar/', { anexo });
            showMessage(`Anexo ${anexo} ahora disponible`, 'success');
            fetchData();
        } catch (error) {
            showMessage('Error al liberar', 'error');
        }
    };

    const toggleDept = (dept) => {
        setCollapsedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
    };

    const groupedData = useMemo(() => {
        if (!data?.anexos_ocupados) return {};
        const groups = {};

        data.anexos_ocupados.forEach(item => {
            const key = item.funcionario.subdireccion || 'DIRECCIÓN / OTROS';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });

        const filteredGroups = {};
        Object.keys(groups).forEach(key => {
            const matches = groups[key].filter(item =>
                item.funcionario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.anexo.toString().includes(searchTerm) ||
                (item.funcionario.rut || '').includes(searchTerm) ||
                (item.funcionario.departamento || '').toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (matches.length > 0 && (activeSection === 'all' || activeSection === key)) {
                filteredGroups[key] = matches;
            }
        });

        return filteredGroups;
    }, [data, searchTerm, activeSection]);

    const statsByGroup = useMemo(() => {
        if (!data?.anexos_ocupados) return {};
        const stats = {};
        data.anexos_ocupados.forEach(item => {
            const key = item.funcionario.subdireccion || 'DIRECCIÓN / OTROS';
            stats[key] = (stats[key] || 0) + 1;
        });
        return stats;
    }, [data]);

    const subdireccionesList = useMemo(() => Object.keys(statsByGroup).sort(), [statsByGroup]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase">Sincronizando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] bg-white flex flex-col lg:flex-row overflow-hidden font-sans antialiased text-slate-900 border border-slate-200 rounded-[2rem] shadow-sm m-4">
            {/* Sidebar de Control */}
            <aside className="w-full lg:w-72 bg-slate-50 border-r border-slate-200 flex flex-col p-6 space-y-6 overflow-hidden">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Phone className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-slate-800">Anexos telefónicos</h2>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el directorio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 py-3 pl-10 pr-4 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Subdirección</label>
                        <button
                            onClick={() => setActiveSection('all')}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeSection === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                        >
                            <span className="text-[11px] font-black">Todas</span>
                            <span className="text-[9px] font-black opacity-60">[{data?.anexos_ocupados?.length || 0}]</span>
                        </button>

                        {subdireccionesList.map(name => (
                            <button
                                key={name}
                                onClick={() => setActiveSection(name)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeSection === name ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                            >
                                <span className="text-[11px] font-black truncate text-left">{name}</span>
                                <span className="text-[9px] font-black opacity-60">[{statsByGroup[name]}]</span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 mb-4">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Números disponibles</span>
                                <Zap className="w-3 h-3 text-emerald-500" />
                            </div>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                                {data?.anexos_disponibles?.length || 0}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setFuncionarioSearch('');
                                setSelectedFuncionarioId('');
                                setSelectedAnexoNum('');
                                setShowAsignarModal(true);
                            }}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-slate-900 active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Vincular Anexo
                        </button>
                    </div>
                </div>
            </aside>

            {/* Listado Principal con Scroll Propio */}
            <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
                <header className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Directorio Subdirecciones</h1>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Estado: Activo</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-12 custom-scrollbar-main">
                    <AnimatePresence mode="popLayout">
                        {Object.keys(groupedData).length > 0 ? (
                            Object.keys(groupedData).map((key) => (
                                <section key={key} className="space-y-4">
                                    <button
                                        onClick={() => toggleDept(key)}
                                        className="flex items-center gap-4 w-full text-left group border-b border-slate-50 pb-3"
                                    >
                                        <ChevronDown className={`w-4 h-4 text-indigo-500 transition-transform duration-300 ${collapsedDepts[key] ? '-rotate-90' : ''}`} />
                                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] group-hover:text-indigo-600 transition-colors">
                                            {key}
                                            <span className="ml-4 font-mono opacity-30 text-[10px]">{groupedData[key].length} registros</span>
                                        </h2>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {!collapsedDepts[key] && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-1 mt-2">
                                                    <div className="grid grid-cols-12 px-6 py-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                        <div className="col-span-6 sm:col-span-5">Funcionario / Departamento</div>
                                                        <div className="col-span-3 sm:col-span-4">RUT</div>
                                                        <div className="col-span-3 sm:col-span-3 text-right">Extensión</div>
                                                    </div>

                                                    {groupedData[key].map((item) => (
                                                        <div
                                                            key={item.anexo}
                                                            className="grid grid-cols-12 items-center px-6 py-2.5 hover:bg-slate-50 rounded-xl transition-all group"
                                                        >
                                                            <div className="col-span-6 sm:col-span-5 min-w-0 pr-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-slate-800 tracking-tight truncate leading-tight group-hover:text-indigo-700 transition-colors">
                                                                        {item.funcionario.nombre}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-400 truncate opacity-70">
                                                                        {item.funcionario.departamento || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="col-span-3 sm:col-span-4 font-mono text-[10px] font-bold text-slate-400">
                                                                {item.funcionario.rut}
                                                            </div>
                                                            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-6 overflow-hidden">
                                                                <div className="flex items-center gap-2 group-hover:translate-x-[-10px] transition-transform">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-30" />
                                                                    <span className="text-base font-black text-slate-900 font-mono tracking-tighter">
                                                                        {item.anexo}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleLiberar(item.anexo)}
                                                                    className="p-1 px-4 bg-slate-100 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 absolute"
                                                                >
                                                                    Liberar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </section>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                <Search className="w-12 h-12 mb-4 mx-auto text-slate-200" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin resultados en directorio</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Modal de Vinculación - Botón Gigante */}
            <AnimatePresence>
                {showAsignarModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full border border-slate-100"
                        >
                            <div className="flex justify-between items-start mb-10">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Configuración</p>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Vincular Anexo</h3>
                                </div>
                                <button onClick={() => setShowAsignarModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                                    <X className="w-7 h-7 text-slate-300" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Elegir Anexo Libre</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500" />
                                        <select
                                            value={selectedAnexoNum}
                                            onChange={(e) => setSelectedAnexoNum(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 py-3 pl-10 pr-6 rounded-xl text-[11px] font-black appearance-none cursor-pointer focus:bg-white focus:border-indigo-600 outline-none transition-all"
                                        >
                                            <option value="">SELECCIONAR ANEXO...</option>
                                            {data?.anexos_disponibles.map(num => (
                                                <option key={num} value={num}>ANEXO #{num}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Buscar Funcionario</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-500" />
                                        <input
                                            type="text"
                                            placeholder="Nombre o RUT..."
                                            value={funcionarioSearch}
                                            onChange={(e) => setFuncionarioSearch(e.target.value)}
                                            className="w-full bg-slate-50 py-3 pl-10 pr-6 rounded-xl text-[10px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/5 transition-all border border-transparent focus:border-slate-200 shadow-inner"
                                        />
                                    </div>
                                    <select
                                        value={selectedFuncionarioId}
                                        onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                                        className="w-full bg-white border border-slate-200 py-3 px-5 rounded-xl text-[10px] font-black appearance-none cursor-pointer focus:border-indigo-600 outline-none transition-all"
                                    >
                                        <option value="">-- SELECCIONAR DE LA LISTA --</option>
                                        {data?.funcionarios_activos
                                            .filter(f => f.nombre_funcionario.toLowerCase().includes(funcionarioSearch.toLowerCase()) || f.rut.includes(funcionarioSearch))
                                            .map(func => (
                                                <option key={func.id} value={func.id}>{func.nombre_funcionario} ({func.rut})</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <button
                                    onClick={handleAsignar}
                                    disabled={!selectedFuncionarioId || !selectedAnexoNum}
                                    className="w-full bg-slate-900 hover:bg-indigo-600 disabled:opacity-20 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/10 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 mt-4"
                                >
                                    Establecer Vínculo
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notificaciones */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[300] px-10 py-5 rounded-2xl shadow-2xl flex items-center gap-4 font-black text-xs uppercase tracking-widest border ${message.type === 'success' ? 'bg-slate-900 text-white border-indigo-500/30' : 'bg-rose-700 text-white border-rose-400/30'
                            }`}
                    >
                        {message.type === 'success' ? <Check className="w-5 h-5 text-indigo-400" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar-main::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                .custom-scrollbar-main::-webkit-scrollbar-track { background: #f8fafc; }
            `}</style>
        </div>
    );
};

export default AnexosDashboard;
