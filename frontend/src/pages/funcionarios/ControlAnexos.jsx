import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Search, X, Check, AlertCircle, Info, User, Building, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const ControlAnexos = ({ isOpen, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAnexo, setSelectedAnexo] = useState(null);
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [funcionarioSearch, setFuncionarioSearch] = useState('');
    const [message, setMessage] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

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

    // Mapeo rápido de anexos ocupados
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

    // Generar el grid de 400 a 600
    const gridItems = useMemo(() => {
        if (!data) return [];
        const items = [];
        for (let i = data.anexo_min; i <= data.anexo_max; i++) {
            items.push(i);
        }
        return items;
    }, [data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-100"
            >
                {/* Header Premium */}
                <div className="bg-white px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mapa de Anexos</h2>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    {data?.anexos_disponibles?.length || 0} Libres
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {data?.anexos_ocupados?.length || 0} Ocupados
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Resaltar funcionario..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    // Búsqueda instantánea local para el grid
                                }}
                                className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl p-2 transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Dashboard Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Interactive Grid Map (Cero Scroll) */}
                    <div className="flex-1 p-6 bg-gray-50/30 flex flex-col items-center justify-center border-r border-gray-50">
                        <div
                            className="grid gap-1.5 w-full max-w-[900px] mx-auto"
                            style={{
                                gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
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
                                            relative aspect-square flex items-center justify-center rounded-lg text-[10px] font-black transition-all
                                            ${isSelected ? 'ring-2 ring-blue-600 ring-offset-1 z-20 shadow-lg' : ''}
                                            ${isOccupied
                                                ? isSearchMatch
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-400'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-white text-gray-300 border border-gray-200 hover:bg-green-500 hover:text-white hover:border-transparent shadow-sm'
                                            }
                                        `}
                                    >
                                        {num}
                                    </motion.button>
                                );
                            })}
                        </div>
                        <div className="mt-8 flex gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-white border border-gray-200 rounded-sm" /> Disponible
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-600 rounded-sm" /> Ocupado
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-sm" /> Coincidencia
                            </div>
                        </div>
                    </div>

                    {/* Right: Dynamic Sidebar Details */}
                    <div className="w-[400px] flex flex-col bg-white overflow-y-auto border-l border-gray-50 p-8">
                        <AnimatePresence mode="wait">
                            {selectedAnexo ? (
                                <motion.div
                                    key={`detail-${selectedAnexo}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col h-full"
                                >
                                    <div className="mb-8">
                                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Anexo Seleccionado</span>
                                        <h3 className="text-4xl font-black text-blue-600 mt-1">#{selectedAnexo}</h3>
                                    </div>

                                    {occupiedMap[selectedAnexo] ? (
                                        <div className="space-y-8 flex-1">
                                            {/* Profile Card */}
                                            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                                        <User className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 leading-tight">
                                                            {occupiedMap[selectedAnexo].nombre}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 font-mono mt-1">
                                                            {occupiedMap[selectedAnexo].rut}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3">
                                                        <Building className="w-4 h-4 text-gray-400 mt-1" />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Dependencia</p>
                                                            <p className="text-sm font-semibold text-gray-700">
                                                                {occupiedMap[selectedAnexo].departamento || occupiedMap[selectedAnexo].subdireccion || 'Sin unidad'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-50">
                                                <button
                                                    onClick={() => handleLiberar(selectedAnexo)}
                                                    className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                    Liberar Anexo
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 flex-1">
                                            <div className="bg-green-50/50 rounded-3xl p-6 border border-green-100 border-dashed">
                                                <p className="text-green-700 text-sm font-medium flex items-center gap-2">
                                                    <Info className="w-4 h-4" />
                                                    Este anexo está listo para ser asignado.
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase px-1">Buscar Funcionario</label>
                                                    <div className="relative mt-1.5">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                        <input
                                                            type="text"
                                                            placeholder="Nombre o RUT..."
                                                            value={funcionarioSearch}
                                                            onChange={(e) => setFuncionarioSearch(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-100"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase px-1">Seleccionar</label>
                                                    <select
                                                        value={selectedFuncionarioId}
                                                        onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                                                        className="w-full mt-1.5 px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer font-medium"
                                                    >
                                                        <option value="">-- Elige un funcionario --</option>
                                                        {filteredFuncionarios.map(func => (
                                                            <option key={func.id} value={func.id}>
                                                                {func.nombre_funcionario} ({func.rut})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={handleAsignar}
                                                    disabled={!selectedFuncionarioId}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
                                                >
                                                    Asignar Ahora
                                                    <ArrowRight className="w-5 h-5" />
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
                                    className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6"
                                >
                                    <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Info className="w-10 h-10 text-gray-200" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">Selecciona un Anexo</h4>
                                        <p className="text-sm text-gray-400 mt-2">
                                            Haz clic en cualquier cuadro de la cuadrícula para ver detalles o realizar una asignación.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 w-full pt-8">
                                        <div className="p-4 rounded-2xl bg-green-50 border border-green-100 text-center">
                                            <p className="text-xl font-black text-green-700">{data?.anexos_disponibles?.length || 0}</p>
                                            <p className="text-[10px] font-bold text-green-600 uppercase">Capacidad Libre</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                            <p className="text-xl font-black text-blue-700">{data?.anexos_ocupados?.length || 0}</p>
                                            <p className="text-[10px] font-bold text-blue-600 uppercase">Uso Actual</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Confirm Dialog Layer */}
                <AnimatePresence>
                    {confirmDialog && (
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-100"
                            >
                                <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Confirmar reasignación</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8">{confirmDialog.message}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmDialog(null)}
                                        className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDialog.onConfirm}
                                        className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Floating Notification */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${message.type === 'success'
                                ? 'bg-gray-900 text-white'
                                : 'bg-red-600 text-white'
                                }`}
                        >
                            {message.type === 'success' ? (
                                <Check className="w-4 h-4 text-green-400" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-100" />
                            )}
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ControlAnexos;
