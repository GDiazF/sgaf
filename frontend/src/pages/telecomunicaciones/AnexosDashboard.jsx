import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, Check, AlertCircle, Info, User, Building, Trash2, ArrowRight, ChevronRight, Key, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const AnexosDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAnexo, setSelectedAnexo] = useState(null);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [funcionarioSearch, setFuncionarioSearch] = useState('');
    const [message, setMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

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

    const occupiedMap = useMemo(() => {
        if (!data?.anexos_ocupados) return {};
        return data.anexos_ocupados.reduce((acc, curr) => {
            acc[curr.anexo] = curr.funcionario;
            return acc;
        }, {});
    }, [data]);

    const handleAsignar = async () => {
        if (!selectedFuncionarioId) {
            showMessage('Debes seleccionar un funcionario', 'error');
            return;
        }

        const funcionario = data.funcionarios_activos.find(f => f.id == selectedFuncionarioId);
        if (funcionario && funcionario.anexo && funcionario.anexo !== String(selectedAnexo)) {
            setConfirmDialog({
                message: `${funcionario.nombre_funcionario} ya tiene el anexo ${funcionario.anexo}. ¿Deseas reemplazarlo por ${selectedAnexo}?`,
                onConfirm: () => executeAsignar()
            });
            return;
        }

        executeAsignar();
    };

    const executeAsignar = async () => {
        try {
            await api.post('control-anexos/asignar/', {
                anexo: selectedAnexo,
                funcionario_id: selectedFuncionarioId
            });
            showMessage(`Anexo ${selectedAnexo} asignado`, 'success');
            setSelectedAnexo(null);
            setSelectedFuncionarioId('');
            setFuncionarioSearch('');
            setConfirmDialog(null);
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al asignar';
            showMessage(errorMsg, 'error');
        }
    };

    const handleLiberar = async (anexo) => {
        try {
            await api.post('control-anexos/liberar/', { anexo });
            showMessage(`Anexo ${anexo} liberado`, 'success');
            if (selectedAnexo === anexo) setSelectedAnexo(null);
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al liberar';
            showMessage(errorMsg, 'error');
        }
    };

    const filteredFuncionarios = data?.funcionarios_activos.filter(f =>
        f.nombre_funcionario.toLowerCase().includes(funcionarioSearch.toLowerCase()) ||
        f.rut.includes(funcionarioSearch)
    ) || [];

    const gridItems = useMemo(() => {
        if (!data) return [];
        const items = [];
        for (let i = data.anexo_min; i <= data.anexo_max; i++) {
            items.push(i);
        }
        return items;
    }, [data]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4">
            {/* Header Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-emerald-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-bl-[8rem] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                <Phone className="w-5 h-5" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Control de Anexos</h1>
                        </div>
                        <p className="text-slate-500 font-bold text-sm ml-13">Gestión centralizada de extensiones telefónicas SLEP Iquique</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-6 bg-emerald-50/50 px-6 py-3 rounded-2xl border border-emerald-500/10">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-sm font-black text-slate-700">{data?.anexos_disponibles?.length || 0} Libres</span>
                            </div>
                            <div className="w-px h-5 bg-emerald-500/20" />
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-700" />
                                <span className="text-sm font-black text-slate-700">{data?.anexos_ocupados?.length || 0} Ocupados</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Layout */}
            <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
                {/* Visual Map Area */}
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-emerald-500/5 overflow-hidden flex flex-col">
                    {/* Toolbar inside Grid Area */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div className="relative w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar funcionario en mapa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all"
                            />
                        </div>

                        <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm text-[10px] font-black uppercase text-slate-400">
                                <div className="w-2.5 h-2.5 bg-white border border-slate-200 rounded-full" /> Disponible
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm text-[10px] font-black uppercase text-slate-400">
                                <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" /> Ocupado
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm text-[10px] font-black uppercase text-slate-400">
                                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> Coincidencia
                            </div>
                        </div>
                    </div>

                    {/* Interactive Grid Map */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar-emerald">
                        <div
                            className="grid gap-2 w-full max-w-[1000px] mx-auto"
                            style={{
                                gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
                            }}
                        >
                            {gridItems.map((num) => {
                                const isOccupied = occupiedMap[num];
                                const isSelected = selectedAnexo === num;
                                const isSearchMatch = searchTerm && isOccupied?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

                                return (
                                    <motion.button
                                        key={num}
                                        whileHover={{ scale: 1.15, zIndex: 10 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setSelectedAnexo(num)}
                                        className={`
                                            relative aspect-square flex flex-col items-center justify-center rounded-[18px] transition-all duration-300
                                            ${isSelected ? 'ring-[3px] ring-emerald-500 ring-offset-2 z-20 shadow-xl scale-110 bg-white' : ''}
                                            ${isOccupied
                                                ? isSearchMatch
                                                    ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-300'
                                                    : 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg hover:shadow-emerald-200'
                                                : isSelected
                                                    ? 'text-emerald-600 border-none'
                                                    : 'bg-white text-slate-300 border border-slate-100 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 shadow-sm'
                                            }
                                        `}
                                    >
                                        <span className="text-[12px] font-black leading-none">{num}</span>
                                        {isOccupied && !isSearchMatch && (
                                            <div className="absolute bottom-1 w-1 h-1 bg-white/40 rounded-full" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Detail Area */}
                <div className="w-full lg:w-[450px] bg-white rounded-[2.5rem] shadow-xl border border-emerald-500/5 flex flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedAnexo ? (
                            <motion.div
                                key={`detail-${selectedAnexo}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                {/* Sidebar Title */}
                                <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Anexo Seleccionado</span>
                                        <h3 className="text-5xl font-black text-emerald-600 mt-1">#{selectedAnexo}</h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedAnexo(null)}
                                        className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                                    >
                                        <ArrowRight className="w-6 h-6 rotate-180" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-emerald">
                                    {occupiedMap[selectedAnexo] ? (
                                        <div className="space-y-8 h-full flex flex-col">
                                            <div className="bg-emerald-50/30 rounded-[2rem] p-8 border border-emerald-500/10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-bl-[4rem] -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                                                <div className="flex items-center gap-5 mb-8 relative">
                                                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                                        <User className="w-8 h-8" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-black text-xl text-slate-900 leading-tight">
                                                            {occupiedMap[selectedAnexo].nombre}
                                                        </h4>
                                                        <p className="text-sm text-emerald-600 font-mono mt-1 font-black tracking-tighter">
                                                            {occupiedMap[selectedAnexo].rut}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 relative">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-emerald-500/10">
                                                            <Building className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dependencia Directa</p>
                                                            <p className="text-md font-black text-slate-800 mt-0.5">
                                                                {occupiedMap[selectedAnexo].departamento || occupiedMap[selectedAnexo].subdireccion || 'Sin unidad'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto">
                                                <button
                                                    onClick={() => handleLiberar(selectedAnexo)}
                                                    className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 group shadow-sm hover:shadow-xl hover:shadow-red-50"
                                                >
                                                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                    Liberar Conexión
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="bg-emerald-50/50 rounded-[2rem] p-8 border-2 border-emerald-400 border-dashed">
                                                <div className="flex items-center gap-3 text-emerald-700 mb-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                                                        <Check className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-black text-sm uppercase tracking-tight">Anexo Disponible</span>
                                                </div>
                                                <p className="text-emerald-700/80 text-sm font-bold leading-relaxed">
                                                    Esta extensión no tiene usuario. Puedes vincularla a un funcionario activo ahora mismo.
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="relative">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">1. Filtrar Personal</label>
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                                        <input
                                                            type="text"
                                                            placeholder="Escribe nombre o RUT..."
                                                            value={funcionarioSearch}
                                                            onChange={(e) => setFuncionarioSearch(e.target.value)}
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-md font-bold focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-300 shadow-inner"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">2. Seleccionar Funcionario</label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedFuncionarioId}
                                                            onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                                                            className="w-full pl-4 pr-12 py-4 bg-slate-50 border-none rounded-2xl text-md font-bold focus:ring-4 focus:ring-emerald-50 appearance-none cursor-pointer shadow-inner"
                                                        >
                                                            <option value="">-- Buscar en la lista --</option>
                                                            {filteredFuncionarios.map(func => (
                                                                <option key={func.id} value={func.id}>
                                                                    {func.nombre_funcionario}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleAsignar}
                                                    disabled={!selectedFuncionarioId}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100/50 text-white py-5 rounded-2xl font-black shadow-2xl shadow-emerald-200 disabled:shadow-none transition-all flex items-center justify-center gap-3 mt-4 group"
                                                >
                                                    Finalizar Asignación
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center p-10 space-y-10"
                            >
                                <div className="space-y-4">
                                    <div className="w-32 h-32 bg-slate-50 rounded-[4rem] flex items-center justify-center shadow-inner relative group mx-auto">
                                        <div className="absolute inset-0 bg-emerald-50 scale-0 group-hover:scale-100 rounded-[4rem] transition-transform duration-500" />
                                        <Phone className="w-12 h-12 text-slate-200 group-hover:text-emerald-500 transition-colors relative" />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Gestión Interactiva</h4>
                                    <p className="text-sm text-slate-400 font-bold px-8 leading-relaxed max-w-xs">
                                        Selecciona un punto en el mapa para ver los detalles de conexión o vincular un usuario.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 w-full px-6">
                                    <div className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-500/10 text-center shadow-sm">
                                        <p className="text-4xl font-black text-emerald-600 leading-none">{data?.anexos_disponibles?.length || 0}</p>
                                        <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-[0.2em] mt-3">Anexos Libres</p>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 text-center shadow-sm">
                                        <p className="text-4xl font-black text-slate-600 leading-none">{data?.anexos_ocupados?.length || 0}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Registros Activos</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Confirm Dialog */}
            <AnimatePresence>
                {confirmDialog && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-md w-full border border-slate-100"
                        >
                            <div className="bg-orange-100 w-16 h-16 rounded-3xl flex items-center justify-center text-orange-600 mb-8 shadow-inner">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Confirmar Reasignación</h3>
                            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-10">{confirmDialog.message}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfirmDialog(null)}
                                    className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black transition-all"
                                >
                                    No, Mantener
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 transition-all font-sans"
                                >
                                    Reasignar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Styles for Scrollbars */}
            <style jsx>{`
                .custom-scrollbar-emerald::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar-emerald::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-emerald::-webkit-scrollbar-thumb {
                    background: #10b981;
                    border-radius: 10px;
                    opacity: 0.2;
                }
                .custom-scrollbar-emerald::-webkit-scrollbar-thumb:hover {
                    background: #059669;
                }
            `}</style>

            {/* Notification */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 font-black text-sm ${message.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></div>
                        ) : (
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><AlertCircle className="w-3.5 h-3.5 text-white" /></div>
                        )}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnexosDashboard;
