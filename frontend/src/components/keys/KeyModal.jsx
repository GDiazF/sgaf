import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Key, Building, MapPin, Hash, Info, Lock } from 'lucide-react';

const KeyModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { establishments }
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        establecimiento: '',
        ubicacion: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                nombre: '',
                establecimiento: '',
                ubicacion: ''
            });
        }
    }, [initialData, isOpen]);

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Llave' : 'Registrar Nueva Llave'}
            subtitle="Gestione el inventario de llaves y su ubicación física"
            icon={Key}
            saveLabel={editingId ? 'Actualizar Llave' : 'Registrar Llave'}
        >
            <div className="space-y-8">
                {/* Section: Identificación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Identificación de Llave
                    </h4>
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombre Descriptivo</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Portón Principal, Oficina Director..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Establecimiento / Unidad</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer font-medium"
                                    value={formData.establecimiento}
                                    onChange={e => setFormData({ ...formData, establecimiento: e.target.value })}
                                >
                                    <option value="">Seleccione el establecimiento...</option>
                                    {establishments.map(est => (
                                        <option key={est.id} value={est.id}>{est.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Ubicación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Ubicación en Almacén
                    </h4>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Ubicación Física (Opcional)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Ej: Tablero de Llaves 1, Gancho 42..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper Note */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        La ubicación exacta ayuda a encontrar la llave rápidamente cuando sea solicitada. Mantenga el inventario actualizado.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default KeyModal;
