import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Search, Check, AlertCircle, Trash2, ArrowRight, Hash, PhoneCall, ChevronDown, Plus, X, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import {
    BTN_PRIMARY,
    BTN_SECONDARY,
    INPUT_FILTER,
    INPUT_FORM,
    LOADER_SPIN,
    MODAL_BACKDROP_LAYER,
    MODAL_HEADER,
    MODAL_HEADER_ICON,
    MODAL_PANEL,
    MODAL_SHELL,
    PAGE_LAYOUT,
    SELECT_FORM,
    TABLE_PANEL,
    TITLE_ICON_BOX,
} from '../funcionarios/shared/funcionariosUi';

const FILTER_LABEL = 'text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block';
const SIDEBAR_ITEM_BASE = 'w-full flex items-center justify-between p-3 rounded-xl transition-all border text-left';
const SIDEBAR_ITEM_ACTIVE = 'bg-blue-600 text-white shadow-md shadow-blue-900/10 border-blue-600';
const SIDEBAR_ITEM_IDLE = 'hover:bg-white text-slate-600 border-transparent hover:border-slate-200';
const STATUS_BADGE = 'text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter';
const MotionDiv = motion.div;

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
    const [confirmLiberarAnexo, setConfirmLiberarAnexo] = useState(null);

    const showMessage = useCallback((text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('control-anexos/');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            showMessage('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    }, [showMessage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const handleLiberar = async () => {
        if (!confirmLiberarAnexo) return;
        try {
            await api.post('control-anexos/liberar/', { anexo: confirmLiberarAnexo });
            showMessage(`Anexo ${confirmLiberarAnexo} ahora disponible`, 'success');
            setConfirmLiberarAnexo(null);
            fetchData();
        } catch (error) {
            console.error('Error freeing extension:', error);
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
            <div className={PAGE_LAYOUT}>
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                    <Loader2 className={LOADER_SPIN} />
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Sincronizando Datos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={PAGE_LAYOUT}>
            <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                <div>
                    <div className="flex items-center gap-3">
                        <div className={TITLE_ICON_BOX}>
                            <PhoneCall className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">TELECOMUNICACIONES</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] md:text-xs font-medium text-slate-500 ml-0">CONTROL Y VINCULACIÓN DE ANEXOS TELEFÓNICOS INSTITUCIONALES.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setFuncionarioSearch('');
                        setSelectedFuncionarioId('');
                        setSelectedAnexoNum('');
                        setShowAsignarModal(true);
                    }}
                    className={BTN_PRIMARY}
                >
                    <Plus className="w-4 h-4" />
                    VINCULAR ANEXO
                </button>
            </div>

            <div className={`${TABLE_PANEL} bg-white flex-col lg:flex-row`}>
            {/* Sidebar de Control */}
            <aside className="w-full lg:w-72 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-4 md:p-5 gap-4 overflow-hidden shrink-0 max-h-[45vh] lg:max-h-none">
                <div className="space-y-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Directorio</h3>
                            <p className="text-[11px] font-medium text-slate-700 uppercase tracking-tight">Anexos telefónicos</p>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR EN EL DIRECTORIO..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={INPUT_FILTER}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    <div className="space-y-1">
                        <label className={FILTER_LABEL}>Subdirección</label>
                        <button
                            onClick={() => setActiveSection('all')}
                            className={`${SIDEBAR_ITEM_BASE} ${activeSection === 'all' ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_IDLE}`}
                        >
                            <span className="text-[11px] font-medium uppercase tracking-tight">Todas</span>
                            <span className="text-[9px] font-black opacity-70">[{data?.anexos_ocupados?.length || 0}]</span>
                        </button>

                        {subdireccionesList.map(name => (
                            <button
                                key={name}
                                onClick={() => setActiveSection(name)}
                                className={`${SIDEBAR_ITEM_BASE} ${activeSection === name ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_IDLE}`}
                            >
                                <span className="text-[11px] font-medium uppercase tracking-tight truncate text-left">{name}</span>
                                <span className="text-[9px] font-black opacity-70">[{statsByGroup[name]}]</span>
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Números disponibles</span>
                                <Zap className="w-3 h-3 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-bold text-slate-800 tracking-tight leading-none">
                                {data?.anexos_disponibles?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Listado Principal con Scroll Propio */}
            <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
                <header className="px-4 md:px-6 lg:px-8 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-[13px] md:text-sm font-bold text-slate-800 tracking-tight uppercase truncate">Directorio Subdirecciones</h1>
                        <span className={`${STATUS_BADGE} bg-emerald-50 text-emerald-600 border-emerald-100 shrink-0`}>Activo</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-8 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {Object.keys(groupedData).length > 0 ? (
                            Object.keys(groupedData).map((key) => (
                                <section key={key} className="space-y-4">
                                    <button
                                        onClick={() => toggleDept(key)}
                                        className="flex items-center gap-3 w-full text-left group border-b border-slate-100 pb-3"
                                    >
                                        <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform duration-300 ${collapsedDepts[key] ? '-rotate-90' : ''}`} />
                                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                                            {key}
                                            <span className="ml-4 font-mono opacity-40 text-[10px] font-medium">{groupedData[key].length} registros</span>
                                        </h2>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {!collapsedDepts[key] && (
                                            <MotionDiv
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-1 mt-2">
                                                    <div className="hidden sm:grid grid-cols-12 px-4 py-2 text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100/50 pb-1.5 mb-1.5">
                                                        <div className="col-span-5">Funcionario / Departamento</div>
                                                        <div className="col-span-4">RUT</div>
                                                        <div className="col-span-3 text-right">Extensión</div>
                                                    </div>

                                                    {groupedData[key].map((item) => (
                                                        <div
                                                            key={item.anexo}
                                                            className="grid grid-cols-1 sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-0 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-blue-100"
                                                        >
                                                            <div className="sm:col-span-5 min-w-0 sm:pr-4">
                                                                 <div className="flex flex-col">
                                                                    <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tighter line-clamp-2 leading-tight group-hover:text-blue-700 transition-colors">
                                                                        {item.funcionario.nombre}
                                                                    </span>
                                                                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest truncate opacity-80 mt-1">
                                                                        {item.funcionario.departamento || '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="sm:col-span-4 font-mono text-[10px] font-medium text-slate-400">
                                                                {item.funcionario.rut}
                                                            </div>
                                                            <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 overflow-hidden">
                                                                <div className="flex items-center gap-2 sm:group-hover:translate-x-[-6px] transition-transform">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-30" />
                                                                    <span className="text-sm font-medium text-slate-800 font-mono tracking-tighter">
                                                                        {item.anexo}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setConfirmLiberarAnexo(item.anexo)}
                                                                    className="h-8 px-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 inline-flex items-center gap-1.5"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Liberar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </MotionDiv>
                                        )}
                                    </AnimatePresence>
                                </section>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                                <Search className="w-12 h-12 mb-4 mx-auto text-slate-200" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin resultados en directorio</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            </div>

            {createPortal(
                <>
                    <AnimatePresence>
                        {showAsignarModal && (
                            <div className={MODAL_SHELL}>
                                <MotionDiv
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={MODAL_BACKDROP_LAYER}
                                    onClick={() => setShowAsignarModal(false)}
                                />
                                <MotionDiv
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                    className={MODAL_PANEL}
                                >
                                    <div className={MODAL_HEADER}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={MODAL_HEADER_ICON}>
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Configuración</p>
                                                <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Vincular Anexo</h3>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowAsignarModal(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">1. Elegir Anexo Libre</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 z-10" />
                                                <select
                                                    value={selectedAnexoNum}
                                                    onChange={(e) => setSelectedAnexoNum(e.target.value)}
                                                    className={`${SELECT_FORM} pl-9`}
                                                >
                                                    <option value="">SELECCIONAR ANEXO...</option>
                                                    {data?.anexos_disponibles.map(num => (
                                                        <option key={num} value={num}>ANEXO #{num}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">2. Buscar Funcionario</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="NOMBRE O RUT..."
                                                    value={funcionarioSearch}
                                                    onChange={(e) => setFuncionarioSearch(e.target.value)}
                                                    className={`${INPUT_FORM} pl-9`}
                                                />
                                            </div>
                                            <select
                                                value={selectedFuncionarioId}
                                                onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                                                className={SELECT_FORM}
                                            >
                                                <option value="">SELECCIONAR DE LA LISTA</option>
                                                {data?.funcionarios_activos
                                                    .filter(f => f.nombre_funcionario.toLowerCase().includes(funcionarioSearch.toLowerCase()) || f.rut.includes(funcionarioSearch))
                                                    .map(func => (
                                                        <option key={func.id} value={func.id}>{func.nombre_funcionario} ({func.rut})</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                        <button onClick={() => setShowAsignarModal(false)} className={BTN_SECONDARY}>
                                            CANCELAR
                                        </button>
                                        <button
                                            onClick={handleAsignar}
                                            disabled={!selectedFuncionarioId || !selectedAnexoNum}
                                            className={BTN_PRIMARY}
                                        >
                                            ESTABLECER VÍNCULO
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </MotionDiv>
                            </div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {confirmLiberarAnexo && (
                            <div className={MODAL_SHELL}>
                                <MotionDiv
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={MODAL_BACKDROP_LAYER}
                                    onClick={() => setConfirmLiberarAnexo(null)}
                                />
                                <MotionDiv
                                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                                    className={MODAL_PANEL}
                                >
                                    <div className={MODAL_HEADER}>
                                        <div>
                                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Confirmación</p>
                                            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Liberar Anexo</h3>
                                        </div>
                                        <button onClick={() => setConfirmLiberarAnexo(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed">
                                            ¿Deseas liberar el anexo {confirmLiberarAnexo}? El número quedará disponible para una nueva vinculación.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                        <button onClick={() => setConfirmLiberarAnexo(null)} className={BTN_SECONDARY}>
                                            CANCELAR
                                        </button>
                                        <button onClick={handleLiberar} className="bg-rose-600 hover:bg-rose-700 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border">
                                            <Trash2 className="w-4 h-4" />
                                            LIBERAR
                                        </button>
                                    </div>
                                </MotionDiv>
                            </div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {message && (
                            <MotionDiv
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest border ${message.type === 'success' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                            >
                                {message.type === 'success' ? <Check className="w-4 h-4 text-blue-500" /> : <AlertCircle className="w-4 h-4" />}
                                {message.text}
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}
        </div>
    );
};

export default AnexosDashboard;
