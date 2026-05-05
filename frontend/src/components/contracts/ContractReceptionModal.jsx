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
        proveedor: contract?.proveedores_asociados?.length === 1 ? contract.proveedores_asociados[0].proveedor : '',
        establecimientos: contract?.establecimientos || [],
        tipo_entrega: '',
        total_neto: '',
        iva: '',
        total_pagar: '',
        grupo_firmante: '',
        firmante: '',
        folio: ''
    };

    const [formData, setFormData] = useState(initialData);
    const [isSplit, setIsSplit] = useState(false);

    useEffect(() => {
        if (isOpen && contract) {
            if (editingRC) {
                setIsSplit(false);
                setFormData({
                    ...editingRC,
                    periodo: editingRC.periodo ? editingRC.periodo.substring(0, 7) : '',
                    // Ensure IDs are used for selects if incoming data has objects
                    tipo_entrega: editingRC.tipo_entrega?.id || editingRC.tipo_entrega,
                    grupo_firmante: editingRC.grupo_firmante?.id || editingRC.grupo_firmante,
                    firmante: editingRC.firmante?.id || editingRC.firmante,
                    establecimientos: editingRC.establecimientos?.map(e => e.id || e) || [],
                    folio: editingRC.folio || ''
                });
            } else {
                setIsSplit(false);
                setFormData({
                    ...initialData,
                    cdp: contract.cdp || '',
                    nro_oc: contract.tipo_oc === 'UNICA' ? (contract.nro_oc || '') : '',
                    descripcion: contract.descripcion,
                    proveedor: contract.proveedores_asociados?.length === 1 ? contract.proveedores_asociados[0].proveedor : '',
                    establecimientos: contract.establecimientos || []
                });
            }
        }
    }, [isOpen, contract, editingRC]);

    // Filter establishments based on selected provider
    const allowedEstablishmentIds = formData.proveedor 
        ? contract?.proveedores_asociados?.find(p => p.proveedor.toString() === formData.proveedor.toString())?.establecimientos || []
        : [];
        
    const filteredEstablishments = formData.proveedor && allowedEstablishmentIds.length > 0
        ? establishments.filter(e => allowedEstablishmentIds.includes(e.id))
        : establishments;

    const handleBulkSelect = (type) => {
        let selectedIds = [];
        if (type === 'ALL') {
            selectedIds = filteredEstablishments.map(e => e.id);
        } else if (type === 'CLEAR') {
            selectedIds = [];
        } else {
            // New dynamic logic: type is the 'area_gestion'
            // 1. Get IDs of TipoEstablecimiento that belong to this area
            const typesInArea = establishmentTypes
                .filter(t => t.area_gestion === type)
                .map(t => t.id);

            // 2. Select establishments belonging to those types from the filtered list
            selectedIds = filteredEstablishments
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

        onSave(finalData, isSplit);
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
            <div className="space-y-10 px-1 py-2">
                {/* Section 1: Identificación del Documento */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        1. Detalles de Facturación
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormInput
                            label="Folio RC"
                            icon={<FileText />}
                            name="folio"
                            placeholder="Opcional (Manual)..."
                            value={formData.folio}
                            onChange={handleChange}
                            inputClassName="font-mono"
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
                            placeholder={contract?.tipo_oc === 'MULTIPLE' ? "Individual para esta RC..." : "Autocompletado..."}
                            value={formData.nro_oc}
                            onChange={handleChange}
                            readOnly={contract?.tipo_oc === 'UNICA' && !!contract?.nro_oc}
                            inputClassName={contract?.tipo_oc === 'UNICA' && contract?.nro_oc ? "bg-slate-100/50" : ""}
                        />
                    </div>
                </div>

                {/* Section 2: Actores Involucrados */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        2. Proveedor y Destino
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormSelect
                            label="Proveedor (Vinculado)"
                            name="proveedor"
                            value={formData.proveedor || ''}
                            onChange={handleChange}
                            required
                            placeholder="Seleccione el proveedor..."
                            options={(contract?.proveedores_asociados || []).map(p => ({ value: p.proveedor, label: p.proveedor_nombre }))}
                        />
                        <div className="space-y-4">
                            <MultiSearchableSelect
                                label="Establecimientos de Destino"
                                options={filteredEstablishments.map(e => ({ value: e.id, label: e.nombre }))}
                                value={formData.establecimientos || []}
                                onChange={(val) => handleSelectChange('establecimientos', val)}
                                placeholder="Seleccione uno o muchos..."
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect('ALL')}
                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    Todos
                                </button>

                            {/* Dynamic Buttons by Area */}
                            {[
                                { key: 'ESTABLECIMIENTO', label: 'Establecimientos' },
                                { key: 'JARDIN', label: 'Jardines VTF' },
                                { key: 'OFICINA', label: 'Oficina Central' }
                            ].map(area => (
                                <button
                                    key={area.key}
                                    type="button"
                                    onClick={() => handleBulkSelect(area.key)}
                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    {area.label}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => handleBulkSelect('CLEAR')}
                                className="px-3 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                        {/* Split Option Checkbox */}
                        {!editingRC && formData.establecimientos?.length > 1 && (
                            <div className="md:col-span-2 mt-2">
                                <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isSplit}
                                        onChange={(e) => setIsSplit(e.target.checked)}
                                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-800">
                                            Generar recepciones individuales por establecimiento ({formData.establecimientos.length} RCs separadas)
                                        </span>
                                        <span className="text-xs text-slate-500 mt-1">
                                            Si se especifica un folio manual (ej. RCI-01), este se incrementará automáticamente (ej. RCI-02, RCI-03) por cada registro generado.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 3: Tiempos y Entrega */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        3. Cronología y Entrega
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="form-label block text-xs font-bold text-slate-700">
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
                        />
                    </div>
                </div>

                {/* Section 4: Detalle y Costos */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        4. Contenido y Finanzas
                    </h4>
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <FormInput
                                label="Concepto / Glosa Base"
                                name="descripcion"
                                value={formData.descripcion || ''}
                                onChange={handleChange}
                                required
                                placeholder="Ej: Servicios de transporte..."
                            />

                            {/* Preview of the final combined description */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                <span className="text-xs font-bold text-slate-700 block">Vista Previa Glosa Final (PDF)</span>
                                <p className="text-xs text-slate-500 leading-relaxed italic whitespace-pre-line">
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
                                />
                                <FormInput
                                    type="number"
                                    label="IVA ($)"
                                    name="iva"
                                    value={formData.iva}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-start">
                                <div className="w-full md:w-1/2">
                                    <FormInput
                                        type="number"
                                        label="Total a Pagar ($)"
                                        name="total_pagar"
                                        value={formData.total_pagar}
                                        onChange={handleChange}
                                        required
                                        placeholder="0"
                                        inputClassName="font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 5: Aprobación */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        5. Firmante de la RC
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        />
                    </div>
                </div>

                {/* Info Box */}
                <div className="flex items-center gap-2.5 text-slate-400 mt-2 pb-2">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Nota: Esta recepción quedará vinculada permanentemente al contrato.
                    </span>
                </div>
            </div>
        </BaseModal>
    );
};

export default ContractReceptionModal;
