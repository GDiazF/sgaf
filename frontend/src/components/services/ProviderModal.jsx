import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import { Building2, Hash, Tag, MapPin, User, Info } from 'lucide-react';

const ProviderModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { providerTypes }
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        acronimo: '',
        tipo_proveedor: '',
        contacto: ''
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
            title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            subtitle="Registre las empresas prestadoras de servicios básicos o críticos"
            icon={Building2}
            saveLabel={editingId ? 'Actualizar Empresa' : 'Registrar Empresa'}
        >
            <div className="space-y-8">
                {/* Identification */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Hash className="w-3.5 h-3.5" /> Información Corporativa
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="Razón Social / Nombre Fantasía"
                            required
                            placeholder="Ej: Compañía General de Electricidad S.A."
                            className="md:col-span-2"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                        />
                        <FormInput
                            label="RUT Empresa"
                            placeholder="Ej: 76.123.456-7"
                            value={formData.rut}
                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                        />
                        <FormInput
                            label="Acrónimo / Sigla (Nemotécnico)"
                            placeholder="Ej: CGE, AGUAS_ALTO"
                            value={formData.acronimo}
                            onChange={e => setFormData({ ...formData, acronimo: e.target.value })}
                        />
                    </div>
                </div>

                {/* Categorization */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Tag className="w-3.5 h-3.5" /> Categorización de Servicio
                    </h4>
                    <FormSelect
                        label="Giro / Tipo de Proveedor"
                        value={formData.tipo_proveedor}
                        onChange={e => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                        options={providerTypes.map(t => ({ value: t.id, label: `${t.nombre} (${t.acronimo_nemotecnico})` }))}
                        placeholder="Seleccione el tipo de servicio..."
                    />
                </div>

                {/* Contact */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <MapPin className="w-3.5 h-3.5" /> Información de Contacto
                    </h4>
                    <FormInput
                        label="Datos de Contacto y Dirección"
                        icon={User}
                        placeholder="Dirección comercial, teléfonos, ejecutivos de cuenta..."
                        value={formData.contacto}
                        onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                        multiline
                        rows="2"
                    />
                </div>

                {/* Helper */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        El acrónimo se utilizará en las visualizaciones compactas y reportes internos. Asegúrese de que sea fácil de identificar.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ProviderModal;
