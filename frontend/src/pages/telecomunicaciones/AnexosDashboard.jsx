import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, Check, AlertCircle, Info, User, Building, Trash2, ArrowRight, ChevronRight, Key } from 'lucide-react';
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">Control de Anexos</h1>
                    <p className="text-gray-500 mt-1">Gestión centralizada de extensiones telefónicas del SLEP Iquique</p>
                </div>
                <div className="flex gap-4">
                    <div className="hidden md:flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-bold text-gray-700">{data?.anexos_disponibles?.length || 0} Libres</span>
                        </div>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            <span className="text-sm font-bold text-gray-700">{data?.anexos_ocupados?.length || 0} Ocupados</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden min-h-[700px] flex">

                {/* Left: Interactive Grid Map (Cero Scroll) */}
                <div className="flex-1 p-10 bg-gray-50/30 flex flex-col items-center justify-center border-r border-gray-100 relative">
                    <div className="absolute top-8 left-10 flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Resaltar funcionario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-100 w-64 transition-all"
                            />
                        </div>
                    </div>

                    <div
                        className="grid gap-2 w-full max-w-[900px] mx-auto"
                        style={{
                            gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                        }}
                    >
                        {gridItems.map((num) => {
                            const isOccupied = occupiedMap[num];
                            const isSelected = selectedAnexo === num;
                            const isSearchMatch = searchTerm && isOccupied?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

                            return (
                                <motion.button
                                    key={num}
                                    whileHover={{ scale: 1.2, zIndex: 10 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedAnexo(num)}
                                    className={`
                                        relative aspect-square flex items-center justify-center rounded-xl text-[10px] font-black transition-all
                                        ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2 z-20 shadow-lg' : ''}
                                        ${isOccupied
                                            ? isSearchMatch
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-400'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-white text-gray-300 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-transparent shadow-sm'
                                        }
                                    `}
                                >
                                    {num}
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="mt-12 flex gap-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-white border border-gray-200 rounded-full" /> Disponible
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" /> Ocupado
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> Coincidencia
                        </div>
                    </div>
                </div>

                {/* Right: Interactive Sidebar */}
                <div className="w-[450px] flex flex-col bg-white overflow-y-auto p-10">
                    <AnimatePresence mode="wait">
                        {selectedAnexo ? (
                            <motion.div
                                key={`detail-${selectedAnexo}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="mb-10">
                                    <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Anexo Seleccionado</span>
                                    <h3 className="text-5xl font-black text-blue-600 mt-1">#{selectedAnexo}</h3>
                                </div>

                                {occupiedMap[selectedAnexo] ? (
                                    <div className="space-y-10 flex-1">
                                        <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-bl-[4rem] -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                                            <div className="flex items-center gap-5 mb-8 relative">
                                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                                    <User className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xl text-gray-900 leading-tight">
                                                        {occupiedMap[selectedAnexo].nombre}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 font-mono mt-1 font-bold">
                                                        {occupiedMap[selectedAnexo].rut}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-6 relative">
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Building className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Dependencia Directa</p>
                                                        <p className="text-md font-bold text-gray-800">
                                                            {occupiedMap[selectedAnexo].departamento || occupiedMap[selectedAnexo].subdireccion || 'Sin unidad'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleLiberar(selectedAnexo)}
                                            className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 group shadow-sm hover:shadow-xl hover:shadow-red-100"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            Liberar Conexión
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-8 flex-1">
                                        <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 border-dashed">
                                            <div className="flex items-center gap-3 text-emerald-700 mb-2">
                                                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                                <span className="font-black text-sm uppercase">Línea Disponible</span>
                                            </div>
                                            <p className="text-emerald-600/80 text-sm font-bold leading-relaxed">
                                                Este anexo no tiene usuarios asignados. Puedes vincularlo a un funcionario activo ahora mismo.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 ml-1 mb-2 block">Buscar en Nómina</label>
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre o RUT..."
                                                        value={funcionarioSearch}
                                                        onChange={(e) => setFuncionarioSearch(e.target.value)}
                                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-md font-bold focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-300 shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 ml-1 mb-2 block">Seleccionar Funcionario</label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedFuncionarioId}
                                                        onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-md font-bold focus:ring-4 focus:ring-blue-50 appearance-none cursor-pointer shadow-inner pr-12"
                                                    >
                                                        <option value="">-- Elige un funcionario --</option>
                                                        {filteredFuncionarios.map(func => (
                                                            <option key={func.id} value={func.id}>
                                                                {func.nombre_funcionario}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleAsignar}
                                                disabled={!selectedFuncionarioId}
                                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 text-white py-5 rounded-2xl font-black shadow-2xl shadow-blue-200 disabled:shadow-none transition-all flex items-center justify-center gap-3 mt-4 group"
                                            >
                                                Vincular Anexo
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center p-10 space-y-8"
                            >
                                <div className="w-32 h-32 bg-gray-50 rounded-[4rem] flex items-center justify-center shadow-inner relative group">
                                    <div className="absolute inset-0 bg-blue-50 scale-0 group-hover:scale-100 rounded-[4rem] transition-transform duration-500" />
                                    <Phone className="w-12 h-12 text-gray-200 group-hover:text-blue-500 transition-colors relative" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-gray-900 leading-tight">Gestión de Extensiones</h4>
                                    <p className="text-md text-gray-400 mt-3 font-bold px-4 leading-relaxed">
                                        Selecciona un punto en el mapa para ver los detalles de conexión o realizar una nueva asignación.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full pt-10">
                                    <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 text-center shadow-sm">
                                        <p className="text-3xl font-black text-emerald-700 leading-none">{data?.anexos_disponibles?.length || 0}</p>
                                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-2">Nodos Libres</p>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-blue-50 border border-blue-100 text-center shadow-sm">
                                        <p className="text-3xl font-black text-blue-700 leading-none">{data?.anexos_ocupados?.length || 0}</p>
                                        <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mt-2">Nodos en Uso</p>
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
                    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full border border-gray-100"
                        >
                            <div className="bg-orange-100 w-16 h-16 rounded-3xl flex items-center justify-center text-orange-600 mb-8 shadow-inner">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3">Confirmar Cambio</h3>
                            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10">{confirmDialog.message}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfirmDialog(null)}
                                    className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all"
                                >
                                    Reasignar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notification */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 font-black text-sm ${message.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
                            }`}
                    >
                        {message.type === 'success' ? (
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5" /></div>
                        ) : (
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><AlertCircle className="w-3.5 h-3.5" /></div>
                        )}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnexosDashboard;
