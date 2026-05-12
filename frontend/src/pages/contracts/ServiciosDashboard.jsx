import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, Plus, Search, Filter, Calendar, 
    ArrowRight, Building2, FileText, Loader2, 
    AlertCircle, X, Save, CheckCircle2,
    Trash2, Shield, Settings, Info, Box, ExternalLink, Edit2, Pencil, ArrowLeft, RefreshCw
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api';

// Map icon names to Lucide components
const IconMap = {
    Truck, Trash2, Shield, Settings, Info, Box, Calendar, FileText, Building2, Edit2, Pencil
};

const ServiciosDashboard = () => {
    const { can } = usePermission();
    const navigate = useNavigate();
    const [servicios, setServicios] = useState([]);
    const [tiposServicios, setTiposServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [formData, setFormData] = useState({
        contrato: '',
        tipo_servicio: '',
        nombre: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Edit state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [updating, setUpdating] = useState(false);

    // Holidays state
    const [isFeriadosModalOpen, setIsFeriadosModalOpen] = useState(false);
    const [feriados, setFeriados] = useState([]);
    const [syncing, setSyncing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [servRes, contRes, tiposRes] = await Promise.all([
                api.get('contratos/servicios/'),
                api.get('contratos/contratos/', { params: { page_size: 1000 } }),
                api.get('contratos/tipos-servicios/')
            ]);
            setServicios(servRes.data.results || servRes.data);
            setContracts(contRes.data.results || contRes.data);
            setTiposServicios(tiposRes.data.results || tiposRes.data);
            
            if (tiposRes.data.length > 0 && !formData.tipo_servicio) {
                setFormData(prev => ({...prev, tipo_servicio: tiposRes.data[0].id}));
            }
        } catch (error) {
            console.error("Error fetching services:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateService = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('contratos/servicios/', formData);
            setIsModalOpen(false);
            setFormData({ contrato: '', tipo_servicio: tiposServicios[0]?.id || '', nombre: '' });
            fetchData();
        } catch (error) {
            console.error("Error creating service:", error);
            alert("Error al crear el servicio operativo.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateService = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await api.put(`contratos/servicios/${editingService.id}/`, editingService);
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Error al actualizar el servicio.");
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteService = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este servicio operativo? Se eliminarán todas las rutas asociadas.")) return;
        try {
            await api.delete(`contratos/servicios/${id}/`);
            fetchData();
        } catch (error) {
            alert("Error al eliminar el servicio.");
        }
    };

    const openEditModal = (e, servicio) => {
        e.stopPropagation();
        setEditingService({
            id: servicio.id,
            nombre: servicio.nombre,
            tipo_servicio: servicio.tipo_servicio,
            contrato: servicio.contrato
        });
        setIsEditModalOpen(true);
    };

    const fetchFeriados = async () => {
        try {
            const res = await api.get('contratos/feriados/');
            setFeriados(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching feriados:", error);
        }
    };

    const handleSyncFeriados = async () => {
        setSyncing(true);
        try {
            const anios = [2024, 2025, 2026];
            let totalCreados = 0;

            for (const anio of anios) {
                let data = null;
                // Intento 1: Netlify API
                try {
                    const response = await fetch(`https://feriados-cl.netlify.app/api/holidays/${anio}`);
                    if (response.ok) data = await response.json();
                } catch (e) { console.error(`Netlify fail for ${anio}`); }

                // Intento 2: Backup API (Victor San Martin)
                if (!data || !data.feriados) {
                    try {
                        const response = await fetch(`https://api.victorsanmartin.com/feriados/en.json`);
                        if (response.ok) {
                            const raw = await response.json();
                            // Adaptar formato si es necesario
                            data = { feriados: { all: raw.filter(f => f.date.startsWith(String(anio))) } };
                            // Mapeo interno para compatibilidad
                            data.feriados.all = data.feriados.all.map(f => ({
                                ...f,
                                dia: parseInt(f.date.split('-')[2]),
                                mes: parseInt(f.date.split('-')[1])
                            }));
                        }
                    } catch (e) { console.error(`VictorSM fail for ${anio}`); }
                }
                
                if (!data || !data.feriados) continue;

                const feriadosList = [];
                Object.entries(data.feriados).forEach(([mesNombre, items]) => {
                    items.forEach(item => {
                        const mesPad = String(item.mes).padStart(2, '0');
                        const diaPad = String(item.dia).padStart(2, '0');
                        feriadosList.push({
                            fecha: `${anio}-${mesPad}-${diaPad}`,
                            descripcion: item.descripcion || item.title
                        });
                    });
                });

                if (feriadosList.length > 0) {
                    const res = await api.post('contratos/feriados/bulk_create/', feriadosList);
                    totalCreados += res.data.creados;
                }
            }

            alert(`Sincronización completa: ${totalCreados} feriados nuevos añadidos.`);
            fetchFeriados();
        } catch (error) {
            console.error("Sync Error:", error);
            alert("Error al sincronizar: " + (error.message || "Problema de conexión"));
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteFeriado = async (id) => {
        if (!window.confirm("¿Eliminar este feriado?")) return;
        try {
            await api.delete(`contratos/feriados/${id}/`);
            fetchFeriados();
        } catch (error) {
            alert("Error al eliminar feriado.");
        }
    };

    useEffect(() => {
        if (isFeriadosModalOpen) fetchFeriados();
    }, [isFeriadosModalOpen]);

    const filteredServicios = servicios.filter(s => 
        s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contrato_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tipo_servicio_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getIcon = (iconName) => {
        const IconComponent = IconMap[iconName] || Truck;
        return <IconComponent className="w-4 h-4" />;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden animate-in fade-in duration-500">
            {/* Header Limpio */}
            <div className="shrink-0 flex flex-row justify-between items-start lg:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 leading-none uppercase">
                        <Truck className="w-6 h-6 text-indigo-500" />
                        Gestión de Rutas
                    </h2>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Panel operativo de rutas de transporte ({servicios.length})
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {can('contratos.change_rutatransporte') && (
                        <button 
                            onClick={() => setIsFeriadosModalOpen(true)}
                            className="inline-flex items-center justify-center p-2.5 lg:px-4 lg:py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-[14px] lg:rounded-xl transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                        >
                            <Calendar className="w-5 h-5 lg:w-3.5 lg:h-3.5 lg:mr-2 text-indigo-500" />
                            <span className="hidden lg:inline uppercase tracking-widest text-[9px]">Feriados</span>
                        </button>
                    )}
                    {can('contratos.add_rutatransporte') && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center justify-center p-2.5 lg:px-5 lg:py-2 bg-indigo-600 text-white text-sm font-semibold rounded-[14px] lg:rounded-xl overflow-hidden transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                            <span className="hidden lg:inline uppercase tracking-widest text-[10px]">Nueva Ruta</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Contenedor Principal (Tabla) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, contrato o tipo..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando gestiones...</p>
                        </div>
                    ) : filteredServicios.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center opacity-60">
                            <Truck className="w-12 h-12 text-slate-300 mb-3" />
                            <h3 className="text-base font-bold text-slate-600 uppercase tracking-tight">Sin gestiones operativas</h3>
                            <p className="text-slate-400 text-xs mt-1 max-w-xs">No se encontraron gestiones que coincidan con la búsqueda.</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Servicio / Operación</th>
                                    <th className="text-left py-2.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tipo</th>
                                    <th className="text-left py-2.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Contrato Vinculado</th>
                                    <th className="text-center py-2.5 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredServicios.map(servicio => (
                                    <motion.tr 
                                        key={servicio.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => navigate(`/contracts/servicios/${servicio.id}`)}
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    >
                                        <td className="py-2 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                    {getIcon(servicio.tipo_servicio_icono)}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">
                                                        {servicio.nombre}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-6">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                                {servicio.tipo_servicio_nombre}
                                            </span>
                                        </td>
                                        <td className="py-2 px-6">
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="w-3 h-3 text-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-500 truncate max-w-[180px]">{servicio.contrato_nombre || 'No vinculado'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                {can('contratos.change_rutatransporte') && (
                                                    <button 
                                                        onClick={(e) => openEditModal(e, servicio)}
                                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {can('contratos.delete_rutatransporte') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteService(servicio.id); }}
                                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nueva Ruta de Transporte</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleCreateService} className="space-y-5">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contrato</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.contrato} onChange={e => setFormData({...formData, contrato: e.target.value})}><option value="">Seleccionar...</option>{contracts.map(c => (<option key={c.id} value={c.id}>[{c.codigo_mercado_publico}] {c.descripcion.substring(0, 30)}...</option>))}</select></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={formData.tipo_servicio} onChange={e => setFormData({...formData, tipo_servicio: e.target.value})}><option value="">Seleccionar...</option>{tiposServicios.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                                <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Cancelar</button><button disabled={submitting} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isEditModalOpen && editingService && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Editar Gestión</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleUpdateService} className="space-y-5">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editingService.nombre} onChange={e => setEditingService({...editingService, nombre: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contrato</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editingService.contrato} onChange={e => setEditingService({...editingService, contrato: e.target.value})}><option value="">Seleccionar...</option>{contracts.map(c => (<option key={c.id} value={c.id}>[{c.codigo_mercado_publico}] {c.descripcion.substring(0, 30)}...</option>))}</select></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo</label><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={editingService.tipo_servicio} onChange={e => setEditingService({...editingService, tipo_servicio: e.target.value})}><option value="">Seleccionar...</option>{tiposServicios.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                                <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest">Cancelar</button><button disabled={updating} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">{updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isFeriadosModalOpen && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFeriadosModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Calendario de Feriados</h2>
                                    <button onClick={() => setIsFeriadosModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuración nacional para exclusión de días</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="mb-6 flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className={`w-5 h-5 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-900 uppercase">Sincronización Automática</p>
                                            <p className="text-[9px] text-indigo-600 font-bold">Obtener feriados {new Date().getFullYear()} desde apis.digital.gob.cl</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleSyncFeriados}
                                        disabled={syncing}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    >
                                        {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {feriados.map(f => (
                                        <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-700">{f.descripcion}</p>
                                                    <p className="text-[9px] font-mono text-slate-400 font-bold">{f.fecha}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteFeriado(f.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {feriados.length === 0 && !syncing && (
                                        <div className="text-center py-12">
                                            <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">No hay feriados cargados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ServiciosDashboard;
