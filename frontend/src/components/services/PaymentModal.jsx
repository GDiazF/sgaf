import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { DollarSign, Building2, Calendar, FileText, Hash, Info, School, Settings } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';

const PaymentModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { establishments, services }
}) => {
    const [formData, setFormData] = useState({
        servicio: '',
        establecimiento: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        fecha_pago: '',
        nro_documento: '',
        monto_interes: 0,
        monto_total: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleFormSave = () => {
        onSave(formData);
    };

    // Filter services based on selected establishment
    const filteredServices = formData.establecimiento
        ? services.filter(s => s.establecimiento === parseInt(formData.establecimiento))
        : [];

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Registro de Pago' : 'Registrar Pago / Consumo'}
            subtitle="Ingrese los datos de facturación recibidos del proveedor"
            icon={DollarSign}
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Registro' : 'Registrar Pago'}
        >
            <div className="space-y-8">
                {/* Section: Contexto */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> Contexto del Servicio
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SearchableSelect
                            label="Establecimiento"
                            options={establishments ? establishments.map(e => ({ value: e.id, label: e.nombre })) : []}
                            value={formData.establecimiento}
                            onChange={val => setFormData({ ...formData, establecimiento: val, servicio: '' })}
                            placeholder="Seleccione Establecimiento..."
                            required
                        />
                        <SearchableSelect
                            label="Servicio / ID Cliente"
                            options={filteredServices.map(s => ({ value: s.id, label: `${s.proveedor_nombre} - ID: ${s.numero_cliente}` }))}
                            value={formData.servicio}
                            onChange={val => setFormData({ ...formData, servicio: val })}
                            placeholder={formData.establecimiento ? 'Seleccione Servicio...' : 'Primero elija establecimiento'}
                            required
                            disabled={!formData.establecimiento}
                        />
                    </div>
                </div>

                {/* Section: Documento */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Detalles del Documento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nº Documento / Folio</label>
                            <input
                                type="text"
                                required
                                placeholder="Folio de factura/boleta..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.nro_documento}
                                onChange={e => setFormData({ ...formData, nro_documento: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Monto Total ($)</label>
                            <input
                                type="number"
                                required
                                placeholder="Ej: 45000"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.monto_total}
                                onChange={e => setFormData({ ...formData, monto_total: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Interés / Multa (Op.)</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.monto_interes}
                                onChange={e => setFormData({ ...formData, monto_interes: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Cronología */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Cronología del Cobro
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Fecha Emisión</label>
                            <DateInput
                                value={formData.fecha_emision}
                                onChange={val => setFormData({ ...formData, fecha_emision: val })}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Fecha Vencimiento</label>
                            <DateInput
                                value={formData.fecha_vencimiento}
                                onChange={val => setFormData({ ...formData, fecha_vencimiento: val })}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Fecha de Pago</label>
                            <DateInput
                                value={formData.fecha_pago}
                                onChange={val => setFormData({ ...formData, fecha_pago: val })}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        Asegúrese de que el <strong>Monto Total</strong> incluya el IVA y cualquier cargo adicional. Si el pago ya cuenta con Recepción Conforme, aparecerá bloqueado para edición según políticas de integridad.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default PaymentModal;
