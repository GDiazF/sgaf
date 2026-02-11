import React, { useState, useEffect } from 'react';
import { Phone, Plus, Trash2, X, Check, Search, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const EstablishmentPhonesModal = ({ isOpen, onClose, establishment }) => {
    const [phones, setPhones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newPhone, setNewPhone] = useState({ numero: '', etiqueta: '', es_principal: false });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen && establishment) {
            fetchPhones();
        }
    }, [isOpen, establishment]);

    const fetchPhones = async () => {
        setLoading(true);
        try {
            const response = await api.get('telefonos-establecimientos/', {
                params: { establecimiento: establishment.id }
            });
            // Handle paginated or non-paginated responses
            setPhones(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching phones:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhone = async () => {
        if (!newPhone.numero || !newPhone.etiqueta) return;
        try {
            await api.post('telefonos-establecimientos/', {
                ...newPhone,
                establecimiento: establishment.id
            });
            setNewPhone({ numero: '', etiqueta: '', es_principal: false });
            setIsAdding(false);
            fetchPhones();
        } catch (error) {
            console.error("Error adding phone:", error);
            alert("Error al añadir teléfono.");
        }
    };

    const handleDeletePhone = async (id) => {
        if (!window.confirm("¿Eliminar este teléfono?")) return;
        try {
            await api.delete(`telefonos-establecimientos/${id}/`);
            fetchPhones();
        } catch (error) {
            console.error("Error deleting phone:", error);
        }
    };

    const handleSetPrincipal = async (id) => {
        try {
            await api.patch(`telefonos-establecimientos/${id}/`, { es_principal: true });
            fetchPhones();
        } catch (error) {
            console.error("Error setting principal:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Gestión de Teléfonos</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{establishment?.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    {/* Add Phone Section */}
                    <div className="mb-8">
                        {!isAdding ? (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all font-bold group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Añadir nuevo número
                            </button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-50 p-6 rounded-2xl border border-blue-100 space-y-4 shadow-sm"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: +56 9..."
                                            value={newPhone.numero}
                                            onChange={e => setNewPhone({ ...newPhone, numero: e.target.value })}
                                            className="w-full px-4 py-3 bg-white rounded-xl border-none text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Etiqueta</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Secretaría"
                                            value={newPhone.etiqueta}
                                            onChange={e => setNewPhone({ ...newPhone, etiqueta: e.target.value })}
                                            className="w-full px-4 py-3 bg-white rounded-xl border-none text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-1">
                                    <input
                                        type="checkbox"
                                        id="is_principal"
                                        checked={newPhone.es_principal}
                                        onChange={e => setNewPhone({ ...newPhone, es_principal: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_principal" className="text-sm font-bold text-slate-600 cursor-pointer">Marcar como principal</label>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleAddPhone}
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                    >
                                        Guardar Teléfono
                                    </button>
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="px-6 bg-white text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Phones List */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {phones.length > 0 ? (
                                phones.map((phone) => (
                                    <motion.div
                                        key={phone.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            backgroundColor: phone.es_principal ? 'rgba(239, 246, 255, 0.5)' : 'rgba(255, 255, 255, 1)',
                                            borderColor: phone.es_principal ? 'rgba(191, 219, 254, 1)' : 'rgba(248, 250, 252, 1)'
                                        }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{
                                            layout: { type: "spring", stiffness: 300, damping: 30 },
                                            duration: 0.4
                                        }}
                                        className="group p-4 rounded-2xl border-2 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                layout
                                                animate={{
                                                    backgroundColor: phone.es_principal ? '#2563eb' : '#f1f5f9',
                                                    color: phone.es_principal ? '#ffffff' : '#94a3b8'
                                                }}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                                            >
                                                <Phone className="w-5 h-5" />
                                            </motion.div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-800 tracking-tight">{phone.numero}</span>
                                                    <AnimatePresence>
                                                        {phone.es_principal && (
                                                            <motion.span
                                                                initial={{ scale: 0, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="text-[10px] font-extrabold bg-blue-700 text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-md shadow-blue-100 border border-blue-600"
                                                            >
                                                                Principal
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{phone.etiqueta}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!phone.es_principal && (
                                                <button
                                                    onClick={() => handleSetPrincipal(phone.id)}
                                                    className="p-2 hover:bg-blue-600 hover:text-white text-slate-300 rounded-xl transition-all shadow-sm hover:shadow-blue-200"
                                                    title="Marcar como principal"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeletePhone(phone.id)}
                                                className="p-2 hover:bg-red-500 hover:text-white text-slate-300 rounded-xl transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                !loading && (
                                    <div className="text-center py-12 text-slate-400">
                                        <Building className="w-12 h-12 mx-auto mb-3 opacity-10" />
                                        <p className="text-sm font-bold opacity-30">No hay teléfonos registrados</p>
                                    </div>
                                )
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EstablishmentPhonesModal;
