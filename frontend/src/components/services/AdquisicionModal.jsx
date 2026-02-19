import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { ShoppingBag, Calendar, FileText, DollarSign, List, Briefcase, Building2, Info, Hash, Users, CreditCard, PenLine } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';
import MultiSearchableSelect from '../common/MultiSearchableSelect';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import MonthInput from '../common/MonthInput';

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
            icon={ShoppingBag}
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Factura' : 'Guardar Factura'}
        >
            <div className="space-y-6">
                {/* Section: Identificación del Documento */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Hash className="w-3.5 h-3.5" /> Identificación del Documento
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <FormInput
                            label="Folio RC"
                            icon={<FileText />}
                            name="folio"
                            placeholder="Automático..."
                            value={formData.folio}
                            onChange={handleChange}
                            inputClassName="bg-slate-50 font-mono"
                        />
                        <FormInput
                            label="Nº CDP"
                            icon={<Hash />}
                            name="cdp"
                            required
                            placeholder="Certificado..."
                            value={formData.cdp}
                            onChange={handleChange}
                        />
                        <FormInput
                            label="Nº Factura"
                            icon={<FileText />}
                            name="nro_factura"
                            placeholder="Folio..."
                            value={formData.nro_factura}
                            onChange={handleChange}
                        />
                        <FormInput
                            label="Nº Orden de Compra"
                            icon={<Hash />}
                            name="nro_oc"
                            placeholder="Opcional..."
                            value={formData.nro_oc}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Section: Actores Involucrados */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Users className="w-3.5 h-3.5" /> Proveedor y Establecimientos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <SearchableSelect
                            label="Proveedor / Emisor"
                            icon={<Building2 className="w-3.5 h-3.5" />}
                            options={providers.map(p => ({ value: p.id, label: `${p.nombre} (RUT: ${p.rut})` }))}
                            value={formData.proveedor}
                            onChange={(val) => handleSelectChange('proveedor', val)}
                            placeholder="Seleccione proveedor..."
                            required
                        />
                        <div className="space-y-2">
                            <MultiSearchableSelect
                                label="Establecimientos de Destino"
                                icon={<Building2 className="w-3.5 h-3.5" />}
                                options={establishments.map(e => ({ value: e.id, label: e.nombre }))}
                                value={formData.establecimientos || []}
                                onChange={(val) => handleSelectChange('establecimientos', val)}
                                placeholder="Seleccione uno o muchos..."
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect('ALL')}
                                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                    Todos
                                </button>

                                {[
                                    { key: 'ESTABLECIMIENTO', label: 'Establecimientos', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                                    { key: 'JARDIN', label: 'Jardines VTF', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                                    { key: 'OFICINA', label: 'Oficina Central', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }
                                ].map(area => (
                                    <button
                                        key={area.key}
                                        type="button"
                                        onClick={() => handleBulkSelect(area.key)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent ${area.color}`}
                                    >
                                        {area.label}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect('CLEAR')}
                                    className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent text-red-500 hover:bg-red-50"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Tiempos y Entrega */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Calendar className="w-3.5 h-3.5" /> Cronología y Entrega
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="form-label">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Fecha Recepción
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
                            icon={<List />}
                            name="tipo_entrega"
                            value={formData.tipo_entrega}
                            onChange={handleChange}
                            required
                            placeholder="Seleccione..."
                            options={deliveryTypes.map(t => ({ value: t.id, label: t.nombre }))}
                        />
                    </div>
                </div>

                {/* Section: Detalle y Costos */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <PenLine className="w-3.5 h-3.5" /> Contenido y Finanzas
                    </h4>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-3">
                            <FormInput
                                label="Concepto / Glosa Base"
                                icon={<PenLine />}
                                name="descripcion"
                                value={formData.descripcion || ''}
                                onChange={handleChange}
                                required
                                placeholder="Ej: Servicios de transporte, Compra de computadores..."
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
                                    icon={<DollarSign />}
                                    name="total_neto"
                                    value={formData.total_neto}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                />
                                <FormInput
                                    type="number"
                                    label="IVA ($)"
                                    icon={<DollarSign className="text-slate-300" />}
                                    name="iva"
                                    value={formData.iva}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-center">
                                <div className="w-full md:w-1/2">
                                    <FormInput
                                        type="number"
                                        label="Total a Pagar"
                                        icon={<CreditCard className="text-blue-500" />}
                                        name="total_pagar"
                                        value={formData.total_pagar}
                                        onChange={handleChange}
                                        required
                                        placeholder="0"
                                        inputClassName="bg-blue-50/50 border-blue-200 text-blue-700 font-black text-center"
                                        labelClassName="text-blue-600 text-center block w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Aprobación */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        < PenLine className="w-3.5 h-3.5" /> Firmante de la RC
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                        <FormSelect
                            label="Grupo de Firmantes"
                            icon={<Users className="text-blue-500" />}
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
                            inputClassName="bg-blue-50/50 border-blue-100 text-blue-700"
                            labelClassName="text-blue-600"
                        />
                        <FormSelect
                            label="Funcionario Firmante"
                            icon={<Users className="text-amber-500" />}
                            name="firmante"
                            value={formData.firmante || ''}
                            onChange={handleChange}
                            disabled={!formData.grupo_firmante}
                            placeholder="Seleccione funcionario..."
                            options={lookups.groups?.find(g => g.id.toString() === formData.grupo_firmante?.toString())?.miembros_detalle?.map(m => ({
                                value: m.id,
                                label: `${m.nombre} ${m.id === lookups.groups?.find(g => g.id.toString() === formData.grupo_firmante.toString())?.jefe ? '(Jefe)' : ''}`
                            })) || []}
                            inputClassName="bg-amber-50/50 border-amber-100 text-amber-700"
                            labelClassName="text-amber-600"
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
