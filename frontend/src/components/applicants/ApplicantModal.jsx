import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { UserPlus, User, Mail, Phone, Hash, Info } from 'lucide-react';

const ApplicantModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData
}) => {
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                rut: '',
                nombre: '',
                apellido: '',
                telefono: '',
                email: ''
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
            title={editingId ? 'Editar Solicitante' : 'Registrar Nuevo Solicitante'}
            subtitle="Gestione la información de las personas autorizadas para retirar llaves"
            icon={UserPlus}
            saveLabel={editingId ? 'Actualizar Datos' : 'Registrar Solicitante'}
        >
            <div className="space-y-8">
                {/* Section: Identificación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Identificación Personal
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 ml-1">RUT (Sin puntos y con guion)</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: 12345678-k"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium font-mono"
                                value={formData.rut}
                                onChange={e => setFormData({ ...formData, rut: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombres</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Juan Andrés"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Apellidos</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Pérez González"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.apellido}
                                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Contacto */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Información de Contacto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-slate-400" /> Correo Electrónico
                            </label>
                            <input
                                type="email"
                                placeholder="ejemplo@correo.com"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400" /> Teléfono de Contacto
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: +56 9 1234 5678"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper Note */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex gap-3">
                    <Info className="w-5 h-5 text-slate-400 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                        Asegúrese de validar el RUT para evitar duplicados. El correo y teléfono son vitales para notificaciones de llaves pendientes.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ApplicantModal;
