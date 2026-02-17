import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { ShoppingBag, Calendar, FileText, DollarSign, List, Building2, Info, Hash, Users, CreditCard, PenLine } from 'lucide-react';
import DateInput from '../common/DateInput';
import MultiSearchableSelect from '../common/MultiSearchableSelect';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import MonthInput from '../common/MonthInput';

const ContractReceptionModal = ({ isOpen, onClose, onSave, contract, lookups, editingRC = null }) => {
    const { establishments, deliveryTypes, establishmentTypes } = lookups;

    const initialData = {
        cdp: contract?.cdp || '',
        nro_factura: '',
        nro_oc: contract?.tipo_oc === 'UNICA' ? (contract?.nro_oc || '') : '',
        fecha_recepcion: new Date().toISOString().split('T')[0],
        descripcion: contract?.descripcion || '',
        periodo: '',
        proveedor: contract?.proveedor || '',
        establecimientos: contract?.establecimientos || [],
        tipo_entrega: '',
        total_neto: '',
        iva: 0,
        total_pagar: 0,
        grupo_firmante: '',
        firmante: ''
    };

    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        if (isOpen && contract) {
            if (editingRC) {
                setFormData({
                    ...editingRC,
                    periodo: editingRC.periodo ? editingRC.periodo.substring(0, 7) : '',
                    // Ensure IDs are used for selects if incoming data has objects
                    tipo_entrega: editingRC.tipo_entrega?.id || editingRC.tipo_entrega,
                    grupo_firmante: editingRC.grupo_firmante?.id || editingRC.grupo_firmante,
                    firmante: editingRC.firmante?.id || editingRC.firmante,
                    establecimientos: editingRC.establecimientos?.map(e => e.id || e) || []
                });
            } else {
                setFormData({
                    ...initialData,
                    cdp: contract.cdp || '',
                    nro_oc: contract.tipo_oc === 'UNICA' ? (contract.nro_oc || '') : '',
                    descripcion: contract.descripcion,
                    proveedor: contract.proveedor,
                    establecimientos: contract.establecimientos || []
                });
            }
        }
    }, [isOpen, contract, editingRC]);

    const handleBulkSelect = (type) => {
        let selectedIds = [];
        if (type === 'ALL') {
            selectedIds = establishments.map(e => e.id);
        } else if (type === 'CLEAR') {
            selectedIds = [];
        } else {
            // New dynamic logic: type is the 'area_gestion'
            // 1. Get IDs of TipoEstablecimiento that belong to this area
            const typesInArea = establishmentTypes
                .filter(t => t.area_gestion === type)
                .map(t => t.id);

            // 2. Select establishments belonging to those types
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

        establishmentTypes.forEach(t => {
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSave = () => {
        // Prepare data for backend: periodo must be a full date (YYYY-MM-DD)
        const finalData = { ...formData };
        if (finalData.periodo && finalData.periodo.length === 7) {
            finalData.periodo = `${finalData.periodo}-01`;
        }
        onSave(finalData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingRC ? "Editar Recepción de Contrato" : "Registrar Recepción de Contrato"}
            subtitle={`Proceso: ${contract?.codigo_mercado_publico}`}
            icon={ShoppingBag}
            maxWidth="max-w-3xl"
            saveLabel={editingRC ? "Actualizar Recepción" : "Guardar Recepción"}
        >
            <div className="space-y-6">
                {/* Section: Identificación del Documento */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Hash className="w-3.5 h-3.5" /> Detalles de Facturación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
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
                            placeholder={contract?.tipo_oc === 'MULTIPLE' ? "Individual para esta RC..." : "Autocompletado..."}
                            value={formData.nro_oc}
                            onChange={handleChange}
                            readOnly={contract?.tipo_oc === 'UNICA' && !!contract?.nro_oc}
                            inputClassName={contract?.tipo_oc === 'UNICA' && contract?.nro_oc ? "bg-slate-100/50" : ""}
                        />
                    </div>
                </div>

                {/* Section: Actores Involucrados */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Building2 className="w-3.5 h-3.5" /> Proveedor y Destino
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="form-container">
                            <label className="form-label space-x-2">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                <span>Proveedor (Vinculado)</span>
                            </label>
                            <div className="form-input-base flex items-center bg-slate-100/50 border-slate-200 text-slate-500 italic">
                                {contract?.proveedor_nombre || 'Cargando...'}
                            </div>
                        </div>
                        <MultiSearchableSelect
                            label="Establecimientos de Destino"
                            icon={<Building2 className="w-3.5 h-3.5" />}
                            options={establishments.map(e => ({ value: e.id, label: e.nombre }))}
                            value={formData.establecimientos || []}
                            onChange={(val) => handleSelectChange('establecimientos', val)}
                            placeholder="Seleccione uno o muchos..."
                            required
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => handleBulkSelect('ALL')}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                                Todos
                            </button>

                            {/* Dynamic Buttons by Area */}
                            {[
                                { key: 'ESTABLECIMIENTO', label: 'Establecimientos', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                                { key: 'JARDIN', label: 'Jardines VTF', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
                                { key: 'OFICINA', label: 'Oficina Central', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' }
                            ].map(area => (
                                <button
                                    key={area.key}
                                    type="button"
                                    onClick={() => handleBulkSelect(area.key)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent ${area.color}`}
                                >
                                    {area.label}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => handleBulkSelect('CLEAR')}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border border-transparent text-red-500 hover:bg-red-50"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section: Tiempos y Entrega */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <Calendar className="w-3.5 h-3.5" /> Cronología y Entrega
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
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
                                placeholder="Ej: Servicios de transporte..."
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <FormInput
                                type="number"
                                label="Total a Pagar"
                                icon={<CreditCard className="text-blue-500" />}
                                name="total_pagar"
                                value={formData.total_pagar}
                                onChange={handleChange}
                                required
                                placeholder="0"
                                inputClassName="bg-blue-50/50 border-blue-200 text-blue-700 font-black"
                                labelClassName="text-blue-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Aprobación */}
                <div className="space-y-4">
                    <h4 className="form-section-header">
                        <PenLine className="w-3.5 h-3.5" /> Firmante de la RC
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
                            inputClassName="bg-blue-50/50 border-blue-100 text-blue-700 font-bold"
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
                            inputClassName="bg-amber-50/50 border-amber-100 text-amber-700 font-bold"
                            labelClassName="text-amber-600"
                        />
                    </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex gap-3">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700/70 leading-relaxed font-bold uppercase tracking-tight">
                        Nota: Esta recepción quedará vinculada permanentemente al expediente del contrato {contract?.codigo_mercado_publico}.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ContractReceptionModal;
