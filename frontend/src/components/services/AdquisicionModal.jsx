import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { ShoppingBag, Calendar, FileText, DollarSign, List, Briefcase, Building2, Info, Hash, Users } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';

const AdquisicionModal = ({ isOpen, onClose, onSave, editingId, initialData, lookups }) => {
    const [formData, setFormData] = useState(initialData);
    const { establishments, providers, deliveryTypes } = lookups;

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData);
        }
    }, [isOpen, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Factura de Adquisición' : 'Registrar Adquisición Directa'}
            subtitle="Complete los detalles de la compra sin número de servicio asociado"
            icon={ShoppingBag}
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Factura' : 'Guardar Factura'}
        >
            <div className="space-y-6">
                {/* Section: Identificación y Origen */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3 h-3" /> Identificación y Origen
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Hash className="w-2.5 h-2.5" /> Nº Certificado Presupuesto (CDP)
                            </label>
                            <input
                                type="text"
                                name="cdp"
                                required
                                placeholder="Nº CDP..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                value={formData.cdp}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <FileText className="w-2.5 h-2.5" /> Nº Factura
                            </label>
                            <input
                                type="text"
                                name="nro_factura"
                                placeholder="Nº Factura..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                value={formData.nro_factura}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Hash className="w-2.5 h-2.5" /> Nº Orden de Compra (Opcional)
                            </label>
                            <input
                                type="text"
                                name="nro_oc"
                                placeholder="Ej: 1234-56-LP24..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                value={formData.nro_oc}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 ml-1 flex items-center gap-1.5">
                                <Calendar className="w-2.5 h-2.5" /> Fecha de Recepción
                            </label>
                            <DateInput
                                value={formData.fecha_recepcion}
                                onChange={(val) => handleSelectChange('fecha_recepcion', val)}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Participantes */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3" /> Participantes y Entrega
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SearchableSelect
                            label="Proveedor"
                            options={providers.map(p => ({ value: p.id, label: `${p.nombre} (RUT: ${p.rut})` }))}
                            value={formData.proveedor}
                            onChange={(val) => handleSelectChange('proveedor', val)}
                            placeholder="Buscar proveedor..."
                            required
                        />
                        <SearchableSelect
                            label="Establecimiento"
                            options={establishments.map(e => ({ value: e.id, label: e.nombre }))}
                            value={formData.establecimiento}
                            onChange={(val) => handleSelectChange('establecimiento', val)}
                            placeholder="Buscar establecimiento..."
                            required
                        />
                        <div className="md:col-span-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 ml-1">Tipo de Entrega</label>
                                <select
                                    name="tipo_entrega"
                                    value={formData.tipo_entrega}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                >
                                    <option value="">Seleccione tipo...</option>
                                    {deliveryTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-blue-600 ml-1 flex items-center gap-1.5">
                                    <Users className="w-2.5 h-2.5" /> Grupo de Firmantes
                                </label>
                                <select
                                    name="grupo_firmante"
                                    value={formData.grupo_firmante || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-blue-700 h-[38px]"
                                >
                                    <option value="">Seleccione grupo...</option>
                                    {lookups.groups?.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.nombre} {g.es_firmante ? '(Firmantes)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Detalle y Montos */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Detalle de Adquisición
                    </h4>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 ml-1">Descripción</label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                required
                                rows="2"
                                placeholder="..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 ml-1">Neto ($)</label>
                                <input
                                    type="number"
                                    name="total_neto"
                                    value={formData.total_neto}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 ml-1">IVA ($)</label>
                                <input
                                    type="number"
                                    name="iva"
                                    value={formData.iva}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-semibold h-[38px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-blue-600 ml-1">Total</label>
                                <input
                                    type="number"
                                    name="total_pagar"
                                    value={formData.total_pagar}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-blue-700 h-[38px]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning Box */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-amber-700 leading-tight font-bold uppercase tracking-tight">
                        Nota: Verifique los montos e IVA manualmente si existen saldos exentos. Ingrese el CDP para foliar RC.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default AdquisicionModal;
