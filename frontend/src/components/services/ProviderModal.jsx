import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
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
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Información Corporativa
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 ml-1">Razón Social / Nombre Fantasía</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Compañía General de Electricidad S.A."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">RUT Empresa</label>
                            <input
                                type="text"
                                placeholder="Ej: 76.123.456-7"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.rut}
                                onChange={e => setFormData({ ...formData, rut: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Acrónimo / Sigla (Nemotécnico)</label>
                            <input
                                type="text"
                                placeholder="Ej: CGE, AGUAS_ALTO"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                value={formData.acronimo}
                                onChange={e => setFormData({ ...formData, acronimo: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Categorization */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" /> Categorización de Servicio
                    </h4>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Giro / Tipo de Proveedor</label>
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer font-medium"
                            value={formData.tipo_proveedor}
                            onChange={e => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                        >
                            <option value="">Seleccione el tipo de servicio...</option>
                            {providerTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre} ({t.acronimo_nemotecnico})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Información de Contacto
                    </h4>
                    <div className="space-y-1.5 ">
                        <label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                            <User className="w-3 h-3" /> Datos de Contacto y Dirección
                        </label>
                        <textarea
                            rows="2"
                            placeholder="Dirección comercial, teléfonos, ejecutivos de cuenta..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium resize-none"
                            value={formData.contacto}
                            onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                        />
                    </div>
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
