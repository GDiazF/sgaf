import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Building2, Calendar, FileText, Info } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';

const PAYMENT_INPUT_CLASS = 'no-global !w-full !min-w-0 !box-border !h-10 !min-h-10 !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-0 !rounded-xl !outline-none focus:!border-blue-500 !uppercase !transition-all !shadow-sm placeholder:!text-slate-300';
const PAYMENT_LABEL_CLASS = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const PAYMENT_FIELD_CLASS = 'space-y-1.5 min-w-0';

const SectionHeader = ({ icon, children }) => (
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            {React.createElement(icon, { className: 'w-3.5 h-3.5' })}
        </span>
        {children}
    </h4>
);

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
        monto_total: '',
        consumo: ''
    });

    useEffect(() => {
        if (initialData) {
            // Sync modal form when switching between create/edit records.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData({
                servicio: initialData.servicio || '',
                establecimiento: initialData.establecimiento || '',
                fecha_emision: initialData.fecha_emision || '',
                fecha_vencimiento: initialData.fecha_vencimiento || '',
                fecha_pago: initialData.fecha_pago || '',
                nro_documento: initialData.nro_documento || '',
                monto_interes: initialData.monto_interes || 0,
                monto_total: initialData.monto_total || '',
                consumo: initialData.consumo || ''
            });
        }
    }, [initialData]);

    const handleFormSave = () => {
        onSave(formData);
    };

    // Filter services based on selected establishment
    const filteredServices = formData.establecimiento
        ? services.filter(s => s.establecimiento === parseInt(formData.establecimiento))
        : [];

    const selectedService = services.find(s => s.id === parseInt(formData.servicio));
    const unidadMedida = selectedService?.unidad_medida;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Registro de Pago' : 'Registrar Pago / Consumo'}
            subtitle="Ingrese los datos de facturación recibidos del proveedor"
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Registro' : 'Registrar Pago'}
        >
            <div className="space-y-6 min-w-0 overflow-x-hidden">
                {/* Section: Contexto */}
                <div className="space-y-3">
                    <SectionHeader icon={Building2}>Contexto del Servicio</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SearchableSelect
                            className="min-w-0"
                            label="Establecimiento"
                            options={establishments ? establishments.map(e => ({ value: e.id, label: e.nombre })) : []}
                            value={formData.establecimiento}
                            onChange={val => setFormData({ ...formData, establecimiento: val, servicio: '' })}
                            placeholder="Seleccione Establecimiento..."
                            required
                        />
                        <SearchableSelect
                            className="min-w-0"
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
                <div className="space-y-3">
                    <SectionHeader icon={FileText}>Detalles del Documento</SectionHeader>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${unidadMedida ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Nº Documento / Folio</label>
                            <input
                                type="text"
                                required
                                placeholder="Folio de factura/boleta..."
                                className={PAYMENT_INPUT_CLASS}
                                value={formData.nro_documento}
                                onChange={e => setFormData({ ...formData, nro_documento: e.target.value })}
                            />
                        </div>
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Monto Total ($)</label>
                            <input
                                type="number"
                                required
                                placeholder="Ej: 45000"
                                className={PAYMENT_INPUT_CLASS}
                                value={formData.monto_total}
                                onChange={e => setFormData({ ...formData, monto_total: e.target.value })}
                            />
                        </div>
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Interés / Multa (Op.)</label>
                            <input
                                type="number"
                                placeholder="0"
                                className={PAYMENT_INPUT_CLASS}
                                value={formData.monto_interes}
                                onChange={e => setFormData({ ...formData, monto_interes: e.target.value })}
                            />
                        </div>
                        {unidadMedida && (
                            <div className={`${PAYMENT_FIELD_CLASS} animate-fadeIn`}>
                                <label className={PAYMENT_LABEL_CLASS}>Consumo ({unidadMedida})</label>
                                <input
                                    name="consumo"
                                    type="number"
                                    placeholder={`Lectura en ${unidadMedida}...`}
                                    className={PAYMENT_INPUT_CLASS}
                                    value={formData.consumo}
                                    onChange={e => setFormData({ ...formData, consumo: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Cronología */}
                <div className="space-y-3">
                    <SectionHeader icon={Calendar}>Cronología del Cobro</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Fecha Emisión</label>
                            <DateInput
                                value={formData.fecha_emision}
                                onChange={val => setFormData({ ...formData, fecha_emision: val })}
                                required
                            />
                        </div>
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Fecha Vencimiento</label>
                            <DateInput
                                value={formData.fecha_vencimiento}
                                onChange={val => setFormData({ ...formData, fecha_vencimiento: val })}
                                required
                            />
                        </div>
                        <div className={PAYMENT_FIELD_CLASS}>
                            <label className={PAYMENT_LABEL_CLASS}>Fecha de Pago</label>
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
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium uppercase tracking-tight">
                        Asegúrese de que el <strong>Monto Total</strong> incluya el IVA y cualquier cargo adicional. Si el pago ya cuenta con Recepción Conforme, aparecerá bloqueado para edición según políticas de integridad.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default PaymentModal;
