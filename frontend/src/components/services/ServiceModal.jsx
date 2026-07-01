import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Info } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

const SERVICE_INPUT_CLASS =
    'no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300';

const SERVICE_INPUT_ICON_CLASS =
    'no-global w-full pl-10 pr-3 h-10 text-[10px] font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300';

const SERVICE_SELECT_CLASS =
    "no-global w-full text-[10px] font-black uppercase tracking-widest px-3 h-10 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-blue-500 shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

const SERVICE_LABEL_CLASS =
    'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';

const SectionHeader = ({ children }) => (
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
        {children}
    </h4>
);

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
        tipo_documento: '',
        unidad_medida: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                proveedor: initialData.proveedor || '',
                establecimiento: initialData.establecimiento || '',
                numero_cliente: initialData.numero_cliente || '',
                numero_servicio: initialData.numero_servicio || '',
                tipo_documento: initialData.tipo_documento || '',
                unidad_medida: initialData.unidad_medida || ''
            });
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
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Servicio' : 'Activar Servicio'}
        >
            <div className="space-y-8">
                {/* Core Linkage */}
                <div className="space-y-4">
                    <SectionHeader>Vinculación de Servicio</SectionHeader>
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
                    <SectionHeader>Códigos de Facturación</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={SERVICE_LABEL_CLASS}>Nº Cliente / Cuenta</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">#</span>
                                <input
                                    type="text"
                                    required
                                    placeholder="ID único de pago..."
                                    className={SERVICE_INPUT_ICON_CLASS}
                                    value={formData.numero_cliente}
                                    onChange={e => setFormData({ ...formData, numero_cliente: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className={SERVICE_LABEL_CLASS}>Nº Medidor / Servicio</label>
                            <input
                                type="text"
                                placeholder="Opcional..."
                                className={SERVICE_INPUT_CLASS}
                                value={formData.numero_servicio}
                                onChange={e => setFormData({ ...formData, numero_servicio: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={SERVICE_LABEL_CLASS}>Tipo de Documento</label>
                            <select
                                className={SERVICE_SELECT_CLASS}
                                value={formData.tipo_documento}
                                onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                {documentTypes.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={SERVICE_LABEL_CLASS}>Medición de Consumo</label>
                            <select
                                className={SERVICE_SELECT_CLASS}
                                value={['', 'm3', 'kWh', 'Lts'].includes(formData.unidad_medida) ? formData.unidad_medida : 'custom'}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                        setFormData({ ...formData, unidad_medida: 'Otro' });
                                    } else {
                                        setFormData({ ...formData, unidad_medida: val });
                                    }
                                }}
                            >
                                <option value="">No registra consumo (Costo Fijo)</option>
                                <option value="m3">m³ (Metros Cúbicos - Agua)</option>
                                <option value="kWh">kWh (Kilovatios Hora - Electricidad)</option>
                                <option value="Lts">Lts (Litros - Gas/Combustible)</option>
                                <option value="custom">Otro (Ingresar unidad personalizada)...</option>
                            </select>
                        </div>
                        {(!['', 'm3', 'kWh', 'Lts'].includes(formData.unidad_medida) || formData.unidad_medida === 'Otro') && (
                            <div className="col-span-1 md:col-span-2 space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1">Especifique la Unidad de Medida Personalizada</label>
                                <input
                                    name="unidad_medida"
                                    required
                                    placeholder="Ej: Balones, Galones, m3, etc..."
                                    className={SERVICE_INPUT_CLASS}
                                    value={formData.unidad_medida === 'Otro' ? '' : formData.unidad_medida}
                                    onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 font-medium ml-1">
                                    Esta unidad se mostrará en los reportes e ingresos de pagos mensuales para este servicio.
                                </p>
                            </div>
                        )}
                    </div>
                </div>


                {/* Helper */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        El <strong>Número de Cliente</strong> es el identificador principal para las cargas masivas. Asegúrese de que coincida exactamente con lo que figura en la boleta del proveedor.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ServiceModal;
