import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, FileText, ShieldCheck, Calendar, Wrench, Info, FileIcon, Check, Fuel } from 'lucide-react';
import api from '../../api';

const TipoDocumentoMantenedor = ({ isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'fuel'
    const [tipos, setTipos] = useState([]);
    const [combustibles, setCombustibles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [newTipo, setNewTipo] = useState({
        nombre: '',
        icono: 'FileText',
        color: 'indigo',
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
        { id: 'indigo', bg: 'bg-indigo-500' },
        { id: 'blue', bg: 'bg-blue-500' },
        { id: 'emerald', bg: 'bg-emerald-500' },
        { id: 'amber', bg: 'bg-amber-500' },
        { id: 'rose', bg: 'bg-rose-500' },
        { id: 'slate', bg: 'bg-slate-500' },
        { id: 'purple', bg: 'bg-purple-500' }
    ];

    useEffect(() => {
        if (isOpen) {
            fetchTipos();
            fetchFuel();
        }
    }, [isOpen]);

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

    const handleCreateTipo = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('vehiculos/tipos-documento/', newTipo);
            setTipos([...tipos, response.data]);
            setNewTipo({ nombre: '', icono: 'FileText', color: 'indigo', requerido: false });
            if (onUpdate) onUpdate();
        } catch (error) { alert("Error"); }
    };

    const handleCreateFuel = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('vehiculos/tipos-combustible/', newFuel);
            setCombustibles([...combustibles, response.data]);
            setNewFuel({ nombre: '' });
        } catch (error) { alert("Error al crear combustible."); }
    };

    const handleDeleteTipo = async (id) => {
        if (!window.confirm("¿Eliminar tipo?")) return;
        try {
            await api.delete(`vehiculos/tipos-documento/${id}/`);
            setTipos(tipos.filter(t => t.id !== id));
            if (onUpdate) onUpdate();
        } catch (error) { alert("En uso."); }
    };

    const handleDeleteFuel = async (id) => {
        if (!window.confirm("¿Eliminar combustible?")) return;
        try {
            await api.delete(`vehiculos/tipos-combustible/${id}/`);
            setCombustibles(combustibles.filter(c => c.id !== id));
        } catch (error) { alert("Error: Podría estar en uso."); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configuración de Flota</h3>
                                <div className="flex gap-4 mt-2">
                                    <button 
                                        onClick={() => setActiveTab('docs')}
                                        className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Tipos de Documento
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('fuel')}
                                        className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'fuel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Tipos de Combustible
                                    </button>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {activeTab === 'docs' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Nuevo Documento</h4>
                                        <form onSubmit={handleCreateTipo} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                                                <input value={newTipo.nombre} onChange={e => setNewTipo({...newTipo, nombre: e.target.value})} className="w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/10" required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Icono</label>
                                                <div className="grid grid-cols-6 gap-2">
                                                    {icons.map(item => (
                                                        <button key={item.id} type="button" onClick={() => setNewTipo({...newTipo, icono: item.id})} className={`h-10 rounded-lg flex items-center justify-center transition-all ${newTipo.icono === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><item.icon className="w-5 h-5" /></button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Color</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {colors.map(c => (
                                                        <button key={c.id} type="button" onClick={() => setNewTipo({...newTipo, color: c.id})} className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all ${newTipo.color === c.id ? 'ring-4 ring-offset-2 ring-slate-200 scale-110' : 'opacity-60 hover:opacity-100'}`}>{newTipo.color === c.id && <Check className="w-4 h-4 text-white" />}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Días de aviso previo (Default)</label>
                                                <input 
                                                    type="number" 
                                                    value={newTipo.dias_aviso_defecto} 
                                                    onChange={e => setNewTipo({...newTipo, dias_aviso_defecto: e.target.value})} 
                                                    className="w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/10" 
                                                    placeholder="Ej: 15"
                                                />
                                            </div>
                                            <button type="submit" className="w-full bg-slate-900 text-white h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">Registrar</button>
                                        </form>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Existentes</h4>
                                        <div className="space-y-2">
                                            {tipos.map(t => (
                                                <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-${t.color}-500`}><FileText className="w-5 h-5" /></div>
                                                        <span className="text-xs font-bold text-slate-700">{t.nombre}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTipo(t.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Nuevo Combustible</h4>
                                        <form onSubmit={handleCreateFuel} className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre (Bencina, Diesel, etc)</label>
                                                <input value={newFuel.nombre} onChange={e => setNewFuel({nombre: e.target.value})} className="w-full px-4 h-11 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/10" required />
                                            </div>
                                            <button type="submit" className="w-full bg-slate-900 text-white h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">Registrar</button>
                                        </form>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Lista de Combustibles</h4>
                                        <div className="space-y-2">
                                            {combustibles.map(c => (
                                                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500"><Fuel className="w-5 h-5" /></div>
                                                        <span className="text-xs font-bold text-slate-700">{c.nombre}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteFuel(c.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TipoDocumentoMantenedor;
