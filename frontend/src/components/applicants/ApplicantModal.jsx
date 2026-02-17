import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import FormInput from '../common/FormInput';
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
                    <h4 className="form-section-header">
                        <Hash className="w-3.5 h-3.5" /> Identificación Personal
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="RUT (Sin puntos y con guion)"
                            required
                            placeholder="Ej: 12345678-k"
                            className="md:col-span-2"
                            inputClassName="font-mono"
                            value={formData.rut}
                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                        />
                        <FormInput
                            label="Nombres"
                            required
                            placeholder="Ej: Juan Andrés"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        />
                        <FormInput
                            label="Apellidos"
                            required
                            placeholder="Ej: Pérez González"
                            value={formData.apellido}
                            onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section: Contacto */}
                <div className="space-y-4">
                    <h4 className="form-section-header !text-indigo-600 !bg-indigo-50 !border-indigo-100">
                        <Mail className="w-3.5 h-3.5" /> Información de Contacto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="Correo Electrónico"
                            icon={Mail}
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <FormInput
                            label="Teléfono de Contacto"
                            icon={Phone}
                            placeholder="Ej: +56 9 1234 5678"
                            value={formData.telefono}
                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                        />
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
