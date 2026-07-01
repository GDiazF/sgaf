import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, FileText, ShieldCheck, Calendar, Wrench, Info, FileIcon, Check, Fuel } from 'lucide-react';
import api from '../../api';

const MotionDiv = motion.div;
const FIELD_CLASS = 'no-global w-full !h-10 min-h-10 !text-[10px] font-bold !bg-white !border !border-slate-200 px-3 !rounded-xl outline-none focus:!border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300 box-border leading-none';
const LABEL_CLASS = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const PRIMARY_BTN = 'w-full bg-blue-600 hover:bg-blue-700 text-white !h-10 min-h-10 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all active:scale-95 inline-flex items-center justify-center gap-2 box-border leading-none';
const CONFIG_SECTION = 'w-full md:w-5/12 bg-slate-50 p-4 md:p-5 overflow-y-auto custom-scrollbar border-r border-slate-100';
const LIST_SECTION = 'w-full md:w-7/12 p-4 md:p-5 overflow-y-auto custom-scrollbar bg-white';
const LIST_ITEM = 'flex items-center justify-between h-10 px-3 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all hover:shadow-md';

const TipoDocumentoMantenedor = ({ isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'fuel'
    const [tipos, setTipos] = useState([]);
    const [combustibles, setCombustibles] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    
    const [newTipo, setNewTipo] = useState({
        nombre: '',
        icono: 'FileText',
        color: 'blue',
        requerido: false,
        dias_aviso_defecto: 15
    });

    const [newFuel, setNewFuel] = useState({ nombre: '' });

    const icons = [
        { id: 'FileText', icon: FileText },
        { id: 'ShieldCheck', icon: ShieldCheck },
        { id: 'Calendar', icon: Calendar },
        { id: 'Wrench', icon: Wrench },
        { id: 'Info', icon: Info },
        { id: 'FileIcon', icon: FileIcon }
    ];

    const colors = [
        { id: 'blue', bg: 'bg-blue-500' },
        { id: 'emerald', bg: 'bg-emerald-500' },
        { id: 'amber', bg: 'bg-amber-500' },
        { id: 'rose', bg: 'bg-rose-500' },
        { id: 'slate', bg: 'bg-slate-500' }
    ];

    const fetchTipos = async () => {
        try {
            const response = await api.get('vehiculos/tipos-documento/');
            setTipos(response.data.results || response.data);
        } catch (error) { console.error(error); }
    };

    const fetchFuel = async () => {
        try {
            const response = await api.get('vehiculos/tipos-combustible/');
            setCombustibles(response.data.results || response.data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchTipos();
            fetchFuel();
        }
    }, [isOpen]);

    const handleCreateTipo = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('vehiculos/tipos-documento/', newTipo);
            setTipos([...tipos, response.data]);
            setNewTipo({ nombre: '', icono: 'FileText', color: 'blue', requerido: false, dias_aviso_defecto: 15 });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', text: 'Error al crear el tipo de documento.' });
        }
    };

    const handleCreateFuel = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('vehiculos/tipos-combustible/', newFuel);
            setCombustibles([...combustibles, response.data]);
            setNewFuel({ nombre: '' });
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', text: 'Error al crear combustible.' });
        }
    };

    const handleDeleteTipo = async (id) => {
        setPendingDelete({ type: 'tipo', id, label: 'tipo de documento' });
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            if (pendingDelete.type === 'tipo') {
                await api.delete(`vehiculos/tipos-documento/${pendingDelete.id}/`);
                setTipos(tipos.filter(t => t.id !== pendingDelete.id));
                if (onUpdate) onUpdate();
            } else {
                await api.delete(`vehiculos/tipos-combustible/${pendingDelete.id}/`);
                setCombustibles(combustibles.filter(c => c.id !== pendingDelete.id));
            }
            setPendingDelete(null);
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', text: 'No se pudo eliminar. Puede estar en uso.' });
        }
    };

    const handleDeleteFuel = async (id) => {
        setPendingDelete({ type: 'fuel', id, label: 'combustible' });
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
                    >
                        <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-start bg-white z-10 relative shadow-sm">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight leading-none mb-3">Configuración de Flota</h3>
                                <div className="flex gap-5">
                                    <button 
                                        onClick={() => setActiveTab('docs')}
                                        className={`text-[10px] uppercase tracking-widest pb-1.5 border-b-2 transition-all ${activeTab === 'docs' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-600 font-bold'}`}
                                    >
                                        Tipos de Documento
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('fuel')}
                                        className={`text-[10px] uppercase tracking-widest pb-1.5 border-b-2 transition-all ${activeTab === 'fuel' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-400 hover:text-slate-600 font-bold'}`}
                                    >
                                        Tipos de Combustible
                                    </button>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
                            {activeTab === 'docs' ? (
                                <>
                                    <div className={CONFIG_SECTION}>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Nuevo Documento</h4>
                                            <form onSubmit={handleCreateTipo} className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className={LABEL_CLASS}>Nombre</label>
                                                    <input 
                                                        name="nombre_tipo"
                                                        value={newTipo.nombre} 
                                                        onChange={e => setNewTipo({...newTipo, nombre: e.target.value})} 
                                                        className={FIELD_CLASS} 
                                                        required 
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className={LABEL_CLASS}>Icono</label>
                                                    <div className="grid grid-cols-6 gap-2">
                                                        {icons.map(item => (
                                                            <button key={item.id} type="button" onClick={() => setNewTipo({...newTipo, icono: item.id})} className={`h-10 rounded-xl flex items-center justify-center transition-all ${newTipo.icono === item.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 shadow-sm'}`}><item.icon className="w-4 h-4" /></button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className={LABEL_CLASS}>Color</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {colors.map(c => (
                                                            <button key={c.id} type="button" onClick={() => setNewTipo({...newTipo, color: c.id})} className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all shadow-sm ${newTipo.color === c.id ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-50 hover:opacity-100'}`}>{newTipo.color === c.id && <Check className="w-3 h-3 text-white" />}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className={LABEL_CLASS}>Días de aviso previo</label>
                                                    <input 
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={newTipo.dias_aviso_defecto} 
                                                        onChange={e => setNewTipo({...newTipo, dias_aviso_defecto: e.target.value})} 
                                                        className={FIELD_CLASS} 
                                                        placeholder="Ej: 15"
                                                    />
                                                </div>
                                                <button type="submit" className={PRIMARY_BTN}>
                                                    <Plus className="w-4 h-4" /> Registrar
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    <div className={LIST_SECTION}>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existentes</h4>
                                            <div className="flex flex-col gap-2">
                                                {tipos.map(t => {
                                                    const IconoItem = icons.find(i => i.id === t.icono)?.icon || FileText;
                                                    return (
                                                        <div key={t.id} className={LIST_ITEM}>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-${t.color}-500 bg-${t.color}-50`}><IconoItem className="w-3.5 h-3.5" /></div>
                                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate">{t.nombre}</span>
                                                            </div>
                                                            <button onClick={() => handleDeleteTipo(t.id)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {tipos.length === 0 && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No hay tipos registrados</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={CONFIG_SECTION}>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Nuevo Combustible</h4>
                                            <form onSubmit={handleCreateFuel} className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className={LABEL_CLASS}>Nombre (Bencina, Diesel, etc)</label>
                                                    <input 
                                                        name="nombre_combustible"
                                                        value={newFuel.nombre} 
                                                        onChange={e => setNewFuel({nombre: e.target.value})} 
                                                        className={FIELD_CLASS} 
                                                        required 
                                                    />
                                                </div>
                                                <button type="submit" className={PRIMARY_BTN}>
                                                    <Plus className="w-4 h-4" /> Registrar
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    <div className={LIST_SECTION}>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Combustibles</h4>
                                            <div className="flex flex-col gap-2">
                                                {combustibles.map(c => (
                                                    <div key={c.id} className={LIST_ITEM}>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600"><Fuel className="w-3.5 h-3.5" /></div>
                                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate">{c.nombre}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteFuel(c.id)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            {combustibles.length === 0 && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No hay combustibles</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <AnimatePresence>
                            {feedback && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    className="absolute bottom-4 left-4 right-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center shadow-xl"
                                >
                                    {feedback.text}
                                    <button type="button" onClick={() => setFeedback(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {pendingDelete && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                        onClick={() => setPendingDelete(null)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                                        className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200"
                                    >
                                        <div className="bg-slate-50 border-b border-slate-100 p-4">
                                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Confirmación</p>
                                            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Eliminar {pendingDelete.label}</h3>
                                        </div>
                                        <div className="p-5">
                                            <p className="text-xs font-medium text-slate-700 uppercase leading-relaxed">
                                                ¿Deseas eliminar este {pendingDelete.label}?
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                            <button type="button" onClick={() => setPendingDelete(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                                                Cancelar
                                            </button>
                                            <button type="button" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border">
                                                <Trash2 className="w-4 h-4" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default TipoDocumentoMantenedor;
