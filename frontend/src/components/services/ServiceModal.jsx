import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Settings, Building2, School, Hash, FileText, Info } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

const ServiceModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { providers, establishments, documentTypes }
}) => {
    const [formData, setFormData] = useState({
        proveedor: '',
        establecimiento: '',
        numero_cliente: '',
        numero_servicio: '',
        tipo_documento_habitual: 'FACTURA',
        observaciones: ''
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
            title={editingId ? 'Editar Servicio' : 'Nuevo Alta de Servicio'}
            subtitle="Vincule a un establecimiento con un proveedor y número de cliente"
            icon={Settings}
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Servicio' : 'Activar Servicio'}
        >
            <div className="space-y-8">
                {/* Core Linkage */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Vinculación de Servicio
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SearchableSelect
                            label="Proveedor del Servicio"
                            options={providers ? providers.map(p => ({ value: p.id, label: `${p.nombre} ${p.rut ? `(${p.rut})` : ''}` })) : []}
                            value={formData.proveedor}
                            onChange={val => setFormData({ ...formData, proveedor: val })}
                            placeholder="Seleccione Proveedor..."
                            required
                        />
                        <SearchableSelect
                            label="Establecimiento Beneficiario"
                            options={establishments ? establishments.map(e => ({ value: e.id, label: e.nombre })) : []}
                            value={formData.establecimiento}
                            onChange={val => setFormData({ ...formData, establecimiento: val })}
                            placeholder="Seleccione Establecimiento..."
                            required
                        />
                    </div>
                </div>

                {/* Identification Codes */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Códigos de Facturación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nº Cliente / Cuenta</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="ID único de pago..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                    value={formData.numero_cliente}
                                    onChange={e => setFormData({ ...formData, numero_cliente: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nº Medidor / Servicio</label>
                            <input
                                type="text"
                                placeholder="Opcional..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.numero_servicio}
                                onChange={e => setFormData({ ...formData, numero_servicio: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Documento Habitual</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer font-medium h-[46px]"
                                value={formData.tipo_documento_habitual}
                                onChange={e => setFormData({ ...formData, tipo_documento_habitual: e.target.value })}
                            >
                                {documentTypes.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Antecedentes Adicionales
                    </h4>
                    <div className="space-y-1.5 ">
                        <textarea
                            rows="2"
                            placeholder="Observaciones sobre la facturación o particularidades del servicio..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium resize-none"
                            value={formData.observaciones}
                            onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                        />
                    </div>
                </div>

                {/* Helper */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                        El <strong>Número de Cliente</strong> es el identificador principal para las cargas masivas. Asegúrese de que coincida exactamente con lo que figura en la boleta del proveedor.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ServiceModal;
