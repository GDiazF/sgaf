import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Building2, Info } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';
import MultiSearchableSelect from '../common/MultiSearchableSelect';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import MonthInput from '../common/MonthInput';

const ACQ_INPUT_CLASS =
    'no-global !w-full !h-10 !min-h-10 !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-0 !rounded-xl !outline-none focus:!border-blue-500 uppercase !transition-all !shadow-sm placeholder:!text-slate-300';

const ACQ_READONLY_INPUT_CLASS =
    `${ACQ_INPUT_CLASS} !bg-slate-50 !font-mono !opacity-60 !cursor-not-allowed`;

const ACQ_TOTAL_INPUT_CLASS =
    `${ACQ_INPUT_CLASS} !bg-blue-50/50 !border-blue-200 !text-blue-700 !font-black !text-center focus:!bg-white`;

const ACQ_SELECT_CLASS =
    "no-global !w-full !h-10 !min-h-10 !text-[10px] !font-black uppercase tracking-widest !px-3 !py-0 !rounded-xl !border !border-slate-200 !outline-none cursor-pointer appearance-none !bg-white !text-slate-700 focus:!border-blue-500 !shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

const ACQ_LABEL_CLASS =
    '!block !text-[10px] !font-black !text-slate-500 !uppercase !tracking-widest !mb-1.5 !ml-1';

const BULK_BUTTON_CLASS =
    'h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200';

const SectionHeader = ({ children }) => (
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
        {children}
    </h4>
);

const AdquisicionModal = ({ isOpen, onClose, onSave, editingId, initialData, lookups }) => {
    const [formData, setFormData] = useState(initialData);
    const { establishments, providers, deliveryTypes, establishmentTypes } = lookups;

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...initialData,
                periodo: initialData?.periodo ? initialData.periodo.substring(0, 7) : ''
            });
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
        // Prepare data for backend: periodo must be a full date (YYYY-MM-DD) or null
        const finalData = { ...formData };
        if (finalData.periodo && finalData.periodo.length === 7) {
            finalData.periodo = `${finalData.periodo}-01`;
        } else if (!finalData.periodo) {
            finalData.periodo = null;
        }

        // Ensure establecimientos is at least an empty array if empty
        if (!finalData.establecimientos) {
            finalData.establecimientos = [];
        }

        onSave(finalData);
    };

    const handleBulkSelect = (type) => {
        let selectedIds = [];
        if (type === 'ALL') {
            selectedIds = establishments.map(e => e.id);
        } else if (type === 'CLEAR') {
            selectedIds = [];
        } else {
            const typesInArea = (establishmentTypes || [])
                .filter(t => t.area_gestion === type)
                .map(t => t.id);

            selectedIds = establishments
                .filter(e => typesInArea.includes(e.tipo))
                .map(e => e.id);
        }
        setFormData(prev => ({ ...prev, establecimientos: selectedIds }));
    };

    const getSmartGlosa = () => {
        if (!formData.establecimientos || formData.establecimientos.length === 0) return "";

        const count = formData.establecimientos.length;

        // If all are selected, use summary
        if (count === establishments.length && count > 5) {
            return "\n- TOTALIDAD DE ESTABLECIMIENTOS";
        }

        const selectedSet = new Set(formData.establecimientos);
        const areaTotals = {};
        const areaCounts = {};

        (establishmentTypes || []).forEach(t => {
            const area = t.area_gestion || 'ESTABLECIMIENTO';
            areaTotals[area] = (areaTotals[area] || 0) + establishments.filter(e => e.tipo === t.id).length;
            areaCounts[area] = (areaCounts[area] || 0) + establishments.filter(e => e.tipo === t.id && selectedSet.has(e.id)).length;
        });

        // Summary labels for full areas if more than 5
        if (count > 5) {
            if (areaCounts['ESTABLECIMIENTO'] === areaTotals['ESTABLECIMIENTO'] && count === areaCounts['ESTABLECIMIENTO'])
                return "\n- TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)";
            if (areaCounts['JARDIN'] === areaTotals['JARDIN'] && count === areaCounts['JARDIN'])
                return "\n- TOTALIDAD DE JARDINES INFANTILES VTF";
            if (areaCounts['OFICINA'] === areaTotals['OFICINA'] && count === areaCounts['OFICINA'])
                return "\n- OFICINA CENTRAL ADM.";
        }

        // Default to vertical list
        const names = formData.establecimientos
            .map(id => establishments.find(e => e.id === id)?.nombre)
            .filter(Boolean);

        return names.length > 0 ? "\n- " + names.join('\n- ') : "";
    };


    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Factura de Adquisición' : 'Registrar Adquisición Directa'}
            subtitle="Complete los detalles de la compra sin número de servicio asociado"
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Factura' : 'Guardar Factura'}
        >
            <div className="space-y-6">
                {/* Section: Identificación del Documento */}
                <div className="space-y-4">
                    <SectionHeader>Identificación del Documento</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <FormInput
                            label="Folio RC"
                            name="folio"
                            placeholder="Automático..."
                            value={formData.folio}
                            readOnly
                            labelClassName={ACQ_LABEL_CLASS}
                            inputClassName={ACQ_READONLY_INPUT_CLASS}
                        />
                        <FormInput
                            label="Nº CDP"
                            name="cdp"
                            required
                            placeholder="Certificado..."
                            value={formData.cdp}
                            onChange={handleChange}
                            labelClassName={ACQ_LABEL_CLASS}
                            inputClassName={ACQ_INPUT_CLASS}
                        />
                        <FormInput
                            label="Nº Factura"
                            name="nro_factura"
                            placeholder="Folio..."
                            value={formData.nro_factura}
                            onChange={handleChange}
                            labelClassName={ACQ_LABEL_CLASS}
                            inputClassName={ACQ_INPUT_CLASS}
                        />
                        <FormInput
                            label="Nº Orden de Compra"
                            name="nro_oc"
                            placeholder="Opcional..."
                            value={formData.nro_oc}
                            onChange={handleChange}
                            labelClassName={ACQ_LABEL_CLASS}
                            inputClassName={ACQ_INPUT_CLASS}
                        />
                    </div>
                </div>

                {/* Section: Actores Involucrados */}
                <div className="space-y-4">
                    <SectionHeader>Proveedor y Establecimientos</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <SearchableSelect
                            label="Proveedor / Emisor"
                            icon={Building2}
                            options={providers.map(p => ({ value: p.id, label: `${p.nombre} (RUT: ${p.rut})` }))}
                            value={formData.proveedor}
                            onChange={(val) => handleSelectChange('proveedor', val)}
                            placeholder="Seleccione proveedor..."
                            required
                        />
                        <div className="space-y-2">
                            <MultiSearchableSelect
                                label="Establecimientos de Destino"
                                icon={Building2}
                                options={establishments.map(e => ({ value: e.id, label: e.nombre }))}
                                value={formData.establecimientos || []}
                                onChange={(val) => handleSelectChange('establecimientos', val)}
                                placeholder="Seleccione uno o muchos..."
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect('ALL')}
                                    className={BULK_BUTTON_CLASS}
                                >
                                    Todos
                                </button>

                                {[
                                    { key: 'ESTABLECIMIENTO', label: 'Establecimientos' },
                                    { key: 'JARDIN', label: 'Jardines VTF' },
                                    { key: 'OFICINA', label: 'Oficina Central' }
                                ].map(area => (
                                    <button
                                        key={area.key}
                                        type="button"
                                        onClick={() => handleBulkSelect(area.key)}
                                        className={BULK_BUTTON_CLASS}
                                    >
                                        {area.label}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect('CLEAR')}
                                    className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent text-rose-600 hover:bg-rose-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Tiempos y Entrega */}
                <div className="space-y-4">
                    <SectionHeader>Cronología y Entrega</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                Fecha Recepción
                            </label>
                            <DateInput
                                value={formData.fecha_recepcion}
                                onChange={(val) => handleSelectChange('fecha_recepcion', val)}
                                required
                            />
                        </div>
                        <MonthInput
                            label="Periodo de Cobro"
                            name="periodo"
                            value={formData.periodo || ''}
                            onChange={(val) => handleSelectChange('periodo', val)}
                        />
                        <FormSelect
                            label="Tipo de Entrega"
                            name="tipo_entrega"
                            value={formData.tipo_entrega}
                            onChange={handleChange}
                            required
                            placeholder="Seleccione..."
                            options={deliveryTypes.map(t => ({ value: t.id, label: t.nombre }))}
                            labelClassName={ACQ_LABEL_CLASS}
                            inputClassName={ACQ_SELECT_CLASS}
                        />
                    </div>
                </div>

                {/* Section: Detalle y Costos */}
                <div className="space-y-4">
                    <SectionHeader>Contenido y Finanzas</SectionHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-3">
                            <FormInput
                                label="Concepto / Glosa Base"
                                name="descripcion"
                                value={formData.descripcion || ''}
                                onChange={handleChange}
                                required
                                placeholder="Ej: Servicios de transporte, Compra de computadores..."
                                labelClassName={ACQ_LABEL_CLASS}
                                inputClassName={ACQ_INPUT_CLASS}
                            />

                            {/* Preview of the final combined description */}
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vista Previa Glosa Final (PDF)</span>
                                <p className="text-[11px] text-slate-600 font-bold leading-tight italic whitespace-pre-line">
                                    {formData.descripcion || ''}
                                    {formData.periodo && (() => {
                                        const [year, month] = formData.periodo.split('-');
                                        const date = new Date(year, month - 1, 1);
                                        return ` - ${date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}`;
                                    })()}
                                    {getSmartGlosa()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    type="number"
                                    label="Monto Neto ($)"
                                    name="total_neto"
                                    value={formData.total_neto}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    labelClassName={ACQ_LABEL_CLASS}
                                    inputClassName={ACQ_INPUT_CLASS}
                                />
                                <FormInput
                                    type="number"
                                    label="IVA ($)"
                                    name="iva"
                                    value={formData.iva}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    labelClassName={ACQ_LABEL_CLASS}
                                    inputClassName={ACQ_INPUT_CLASS}
                                />
                            </div>
                            <div className="flex justify-center">
                                <div className="w-full md:w-1/2">
                                    <FormInput
                                        type="number"
                                        label="Total a Pagar"
                                        name="total_pagar"
                                        value={formData.total_pagar}
                                        onChange={handleChange}
                                        required
                                        placeholder="0"
                                        inputClassName={ACQ_TOTAL_INPUT_CLASS}
                                        labelClassName={`${ACQ_LABEL_CLASS} !text-blue-600 !text-center !ml-0`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Aprobación */}
                <div className="space-y-4">
                    <SectionHeader>Firmante de la RC</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <FormSelect
                            label="Grupo de Firmantes"
                            name="grupo_firmante"
                            value={formData.grupo_firmante || ''}
                            onChange={(e) => {
                                const gid = e.target.value;
                                const grp = lookups.groups?.find(g => g.id.toString() === gid);
                                setFormData(prev => ({
                                    ...prev,
                                    grupo_firmante: gid,
                                    firmante: grp ? (grp.jefe || '') : ''
                                }));
                            }}
                            placeholder="Seleccione grupo..."
                            options={lookups.groups?.map(g => ({ value: g.id, label: g.nombre }))}
                            inputClassName={ACQ_SELECT_CLASS}
                            labelClassName={ACQ_LABEL_CLASS}
                        />
                        <FormSelect
                            label="Funcionario Firmante"
                            name="firmante"
                            value={formData.firmante || ''}
                            onChange={handleChange}
                            disabled={!formData.grupo_firmante}
                            placeholder="Seleccione funcionario..."
                            options={lookups.groups?.find(g => g.id.toString() === formData.grupo_firmante?.toString())?.miembros_detalle?.map(m => ({
                                value: m.id,
                                label: `${m.nombre} ${m.id === lookups.groups?.find(g => g.id.toString() === formData.grupo_firmante.toString())?.jefe ? '(Jefe)' : ''}`
                            })) || []}
                            inputClassName={ACQ_SELECT_CLASS}
                            labelClassName={ACQ_LABEL_CLASS}
                        />
                    </div>
                </div>

                {/* Warning Box */}
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-3">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700/70 leading-relaxed font-bold uppercase tracking-tight">
                        Nota: Ingrese el monto neto e IVA. El sistema calculará automáticamente para el documento si el CDP es válido.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default AdquisicionModal;
