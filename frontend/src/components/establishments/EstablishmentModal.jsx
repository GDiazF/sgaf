import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { School, Info, User, Mail, MapPin, Hash, Activity } from 'lucide-react';

const TIPOS = [
    { value: 'SALA_CUNA', label: 'Sala Cuna' },
    { value: 'JARDIN_INFANTIL', label: 'Jardín Infantil' },
    { value: 'ESCUELA', label: 'Escuela' },
    { value: 'LICEO', label: 'Liceo' },
    { value: 'CENTRO_CAPACITACION', label: 'Centro de Capacitación' },
    { value: 'ADMINISTRACION', label: 'Administración' },
];

const EstablishmentModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData
}) => {
    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: 'ESCUELA',
        direccion: '',
        director: '',
        email: '',
        activo: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
            subtitle="Gestione la información base de la institución educativa"
            icon={School}
            saveLabel={editingId ? 'Actualizar Institución' : 'Registrar Institución'}
        >
            <div className="space-y-8">
                {/* Section: Identificación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Identificación Core
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">RBD (Registro Base de Datos)</label>
                            <input
                                type="number"
                                required
                                placeholder="Ej: 12345"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.rbd}
                                onChange={e => setFormData({ ...formData, rbd: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5 ">
                            <label className="text-xs font-bold text-slate-600 ml-1">Tipo de Institución</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer font-medium"
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                            >
                                {TIPOS.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombre Oficial del Establecimiento</label>
                            <input
                                type="text"
                                required
                                placeholder="Nombre completo..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Contacto y Ubicación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Contacto y Ubicación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <User className="w-3 h-3" /> Director(a) / Responsable
                            </label>
                            <input
                                type="text"
                                placeholder="Nombre del directivo..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.director}
                                onChange={e => setFormData({ ...formData, director: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> Correo Institucional
                            </label>
                            <input
                                type="email"
                                placeholder="ejemplo@slep.cl"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> Dirección Física
                            </label>
                            <input
                                type="text"
                                placeholder="Calle, número, comuna..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.direccion}
                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Estado */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Estado Operacional
                    </h4>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div>
                            <span className={`text-sm font-bold ${formData.activo ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {formData.activo ? 'Establecimiento Operativo' : 'Establecimiento Fuera de Servicio'}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium">Determina si el establecimiento figura en los listados activos</p>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default EstablishmentModal;
