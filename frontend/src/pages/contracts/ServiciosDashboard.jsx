import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, Plus, Search, Filter, Calendar, 
    ArrowRight, Building2, FileText, Loader2, 
    AlertCircle, X, Save, CheckCircle2, FolderSearch,
    Trash2, Shield, Settings, Info, Box, ExternalLink, Edit2, Pencil, ArrowLeft, RefreshCw
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import api from '../../api';
import {
    BTN_PRIMARY, BTN_SECONDARY, LOADER_SPIN,
    MODAL_SHELL, MODAL_BACKDROP_LAYER, MODAL_PANEL, MODAL_PANEL_LG,
    SERVICE_ROW_ICON, SERVICE_ROW_TITLE, SERVICE_INPUT, SERVICE_FORM_CONTROL, HOLIDAY_SYNC_BOX,
    TITLE_ICON_BOX,
} from './contractsUi';

// Map icon names to Lucide components
const IconMap = {
    Truck, Trash2, Shield, Settings, Info, Box, Calendar, FileText, Building2, Edit2, Pencil
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

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
    const [errorMessage, setErrorMessage] = useState('');
    const [noticeMessage, setNoticeMessage] = useState('');

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
        setErrorMessage('');
        setNoticeMessage('');
        try {
            await api.post('contratos/servicios/', formData);
            setIsModalOpen(false);
            setFormData({ contrato: '', tipo_servicio: tiposServicios[0]?.id || '', nombre: '' });
            fetchData();
        } catch (error) {
            console.error("Error creating service:", error);
            setErrorMessage('Error al crear el servicio operativo.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateService = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setErrorMessage('');
        setNoticeMessage('');
        try {
            await api.put(`contratos/servicios/${editingService.id}/`, editingService);
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            setErrorMessage('Error al actualizar el servicio.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteService = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar este servicio operativo? Se eliminarán todas las rutas asociadas.")) return;
        try {
            await api.delete(`contratos/servicios/${id}/`);
            setErrorMessage('');
            setNoticeMessage('');
            fetchData();
        } catch (error) {
            setErrorMessage('Error al eliminar el servicio.');
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
        setErrorMessage('');
        setNoticeMessage('');
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

            setNoticeMessage(`Sincronización completa: ${totalCreados} feriados nuevos añadidos.`);
            fetchFeriados();
        } catch (error) {
            console.error("Sync Error:", error);
            setErrorMessage(`Error al sincronizar: ${error.message || 'Problema de conexión'}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteFeriado = async (id) => {
        if (!window.confirm("¿Eliminar este feriado?")) return;
        try {
            await api.delete(`contratos/feriados/${id}/`);
            setErrorMessage('');
            fetchFeriados();
        } catch (error) {
            setErrorMessage('Error al eliminar feriado.');
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
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div className="flex items-center gap-3">
                    <div className={TITLE_ICON_BOX}>
                        <Truck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                            Gestión de Rutas
                        </h2>
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Panel operativo de rutas de transporte ({servicios.length})
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {can('contratos.change_rutatransporte') && (
                        <button 
                            onClick={() => setIsFeriadosModalOpen(true)}
                            className={`${BTN_SECONDARY} p-2.5 lg:px-4 lg:py-2`}
                        >
                            <Calendar className="w-5 h-5 lg:w-3.5 lg:h-3.5 lg:mr-2 text-blue-500" />
                            <span className="hidden lg:inline uppercase tracking-widest text-[9px]">Feriados</span>
                        </button>
                    )}
                    {can('contratos.add_rutatransporte') && (
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className={`${BTN_PRIMARY} p-2.5 lg:px-5 lg:py-2`}
                        >
                            <Plus className="w-5 h-5 lg:w-4 lg:h-4 lg:mr-2" />
                            <span className="hidden lg:inline uppercase tracking-widest text-[10px]">Nueva Ruta</span>
                        </button>
                    )}
                </div>
            </div>

            {(errorMessage || noticeMessage) && (
                <div className={`shrink-0 text-[10px] font-bold uppercase p-3 rounded-xl border flex gap-2 items-center ${
                    errorMessage
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                    {errorMessage ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{errorMessage || noticeMessage}</span>
                </div>
            )}

            {/* Contenedor Principal (Tabla) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, contrato o tipo..."
                            className={SERVICE_INPUT}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className={`${LOADER_SPIN} mb-2`} />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</p>
                        </div>
                    ) : filteredServicios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
                            <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2.5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio / Operación</th>
                                    <th className="text-left py-2.5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                    <th className="text-left py-2.5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrato Vinculado</th>
                                    <th className="text-center py-2.5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Acciones</th>
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
                                                <div className={SERVICE_ROW_ICON}>
                                                    {getIcon(servicio.tipo_servicio_icono)}
                                                </div>
                                                <div>
                                                    <p className={SERVICE_ROW_TITLE}>
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
                                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter truncate max-w-[180px]">{servicio.contrato_nombre || 'No vinculado'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                {can('contratos.change_rutatransporte') && (
                                                    <button 
                                                        onClick={(e) => openEditModal(e, servicio)}
                                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {can('contratos.delete_rutatransporte') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteService(servicio.id); }}
                                                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-colors"
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
            <ModalPortal>
            <AnimatePresence>
                {isModalOpen && (
                    <div className={MODAL_SHELL}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className={MODAL_BACKDROP_LAYER} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={MODAL_PANEL}>
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-center justify-between gap-4 shrink-0">
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nueva Ruta de Transporte</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleCreateService} className="space-y-5 p-4 md:p-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className={SERVICE_FORM_CONTROL} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contrato</label><select required className={SERVICE_FORM_CONTROL} value={formData.contrato} onChange={e => setFormData({...formData, contrato: e.target.value})}><option value="">Seleccionar...</option>{contracts.map(c => (<option key={c.id} value={c.id}>[{c.codigo_mercado_publico}] {c.descripcion.substring(0, 30)}...</option>))}</select></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label><select required className={SERVICE_FORM_CONTROL} value={formData.tipo_servicio} onChange={e => setFormData({...formData, tipo_servicio: e.target.value})}><option value="">Seleccionar...</option>{tiposServicios.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                                <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 ${BTN_SECONDARY}`}>Cancelar</button><button disabled={submitting} type="submit" className={`flex-[2] ${BTN_PRIMARY}`}>{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isEditModalOpen && editingService && (
                    <div className={MODAL_SHELL}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className={MODAL_BACKDROP_LAYER} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={MODAL_PANEL}>
                            <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-center justify-between gap-4 shrink-0">
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Editar Gestión</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleUpdateService} className="space-y-5 p-4 md:p-6">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label><input required type="text" className={SERVICE_FORM_CONTROL} value={editingService.nombre} onChange={e => setEditingService({...editingService, nombre: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contrato</label><select required className={SERVICE_FORM_CONTROL} value={editingService.contrato} onChange={e => setEditingService({...editingService, contrato: e.target.value})}><option value="">Seleccionar...</option>{contracts.map(c => (<option key={c.id} value={c.id}>[{c.codigo_mercado_publico}] {c.descripcion.substring(0, 30)}...</option>))}</select></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo</label><select required className={SERVICE_FORM_CONTROL} value={editingService.tipo_servicio} onChange={e => setEditingService({...editingService, tipo_servicio: e.target.value})}><option value="">Seleccionar...</option>{tiposServicios.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}</select></div>
                                <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className={`flex-1 ${BTN_SECONDARY}`}>Cancelar</button><button disabled={updating} type="submit" className={`flex-[2] ${BTN_PRIMARY}`}>{updating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}</button></div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {isFeriadosModalOpen && (
                    <div className={MODAL_SHELL}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFeriadosModalOpen(false)} className={MODAL_BACKDROP_LAYER} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className={MODAL_PANEL_LG}>
                            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50">
                                <div className="flex items-center justify-between gap-4 mb-2">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Calendario de Feriados</h2>
                                    <button onClick={() => setIsFeriadosModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuración nacional para exclusión de días</p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                                <div className={HOLIDAY_SYNC_BOX}>
                                    <div className="flex items-center gap-3">
                                        <RefreshCw className={`w-5 h-5 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-900 uppercase">Sincronización Automática</p>
                                            <p className="text-[9px] text-blue-600 font-bold">Obtener feriados {new Date().getFullYear()} desde apis.digital.gob.cl</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleSyncFeriados}
                                        disabled={syncing}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
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
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
            </ModalPortal>
        </div>
    );
};

export default ServiciosDashboard;
