import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { FileText, Tag, Hash, Calendar, Info, Building2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';
import MultiSearchableSelect from '../common/MultiSearchableSelect';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';

const ContractModal = ({ isOpen, onClose, onSave, editingId, initialData, lookups }) => {
    const { procesos, estados, categorias, orientaciones, proveedores, establecimientos, tiposEstablecimiento } = lookups;

    const [formData, setFormData] = useState({
        codigo_mercado_publico: '',
        descripcion: '',
        proceso: '',
        estado: '',
        categoria: '',
        orientacion: '',
        proveedor: '',
        fecha_adjudicacion: '',
        fecha_inicio: '',
        fecha_termino: '',
        tipo_oc: 'AGREEMENT',
        nro_oc: '',
        cdp: '',
        monto_total: 0,
        establecimientos: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBulkSelect = (type) => {
        let selectedIds = [];
        if (type === 'ALL') {
            selectedIds = establecimientos.map(e => e.id);
        } else if (type === 'CLEAR') {
            selectedIds = [];
        } else {
            const typesInArea = (tiposEstablecimiento || [])
                .filter(t => t.area_gestion === type)
                .map(t => t.id);

            selectedIds = establecimientos
                .filter(e => typesInArea.includes(e.tipo))
                .map(e => e.id);
        }
        setFormData(prev => ({ ...prev, establecimientos: selectedIds }));
    };

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Contrato' : 'Nueva Licitación / Contrato'}
            subtitle="Complete los detalles técnicos del proceso"
            icon={FileText}
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Contrato' : 'Guardar Contrato'}
        >
            <div className="space-y-8">
                {/* Section: Identificación */}
                <div className="space-y-6">
                    <h4 className="form-section-header">
                        <Hash className="w-3.5 h-3.5" /> IDENTIFICACIÓN DEL PROCESO
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <SearchableSelect
                            label="Proveedor Adjudicado"
                            icon={<Building2 className="w-3.5 h-3.5" />}
                            options={proveedores ? proveedores.map(p => ({ value: p.id, label: p.nombre })) : []}
                            value={formData.proveedor}
                            onChange={val => setFormData({ ...formData, proveedor: val })}
                            placeholder="Seleccione Proveedor..."
                        />
                        <FormInput
                            label="Código Mercado Público"
                            icon={<Tag />}
                            required
                            placeholder="Ej: 1234-56-LP24"
                            value={formData.codigo_mercado_publico}
                            onChange={e => setFormData({ ...formData, codigo_mercado_publico: e.target.value })}
                        />
                        <FormInput
                            label="Nº CDP"
                            icon={<Hash />}
                            placeholder="Certificado de Disponibilidad..."
                            value={formData.cdp}
                            onChange={e => setFormData({ ...formData, cdp: e.target.value })}
                        />
                        <FormInput
                            label="Monto Total Adjudicado ($)"
                            icon={<DollarSign />}
                            type="number"
                            placeholder="Ej: 5000000"
                            value={formData.monto_total}
                            onChange={e => setFormData({ ...formData, monto_total: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <FormInput
                        label="Nombre / Descripción Corta del Proceso"
                        icon={<FileText />}
                        required
                        placeholder="Nombre del servicio o adquisición..."
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    />

                    {/* OC LOGIC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                        <div className="flex flex-col space-y-3">
                            <label className="form-label">Tipo de Orden de Compra</label>
                            <div className="flex gap-4">
                                {[
                                    { id: 'UNICA', label: 'OC Única' },
                                    { id: 'MULTIPLE', label: 'OC Múltiple' }
                                ].map(option => (
                                    <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="tipo_oc"
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full checked:border-blue-500 transition-all cursor-pointer bg-white"
                                                checked={formData.tipo_oc === option.id}
                                                onChange={() => setFormData({ ...formData, tipo_oc: option.id })}
                                            />
                                            <div className="absolute w-2.5 h-2.5 bg-blue-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.tipo_oc === option.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {formData.tipo_oc === 'UNICA' && (
                            <FormInput
                                label="Nº Orden de Compra (Opcional)"
                                placeholder="Ej: 1234-56-LP24"
                                labelClassName="!text-blue-500"
                                inputClassName="!bg-white !border-blue-100 !text-blue-600"
                                icon={Hash}
                                value={formData.nro_oc}
                                onChange={e => setFormData({ ...formData, nro_oc: e.target.value })}
                            />
                        )}
                        {formData.tipo_oc === 'MULTIPLE' && (
                            <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider italic p-2">
                                La OC se ingresará individualmente en cada recepción.
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Clasificación */}
                <div className="space-y-6">
                    <h4 className="form-section-header">
                        <Tag className="w-3.5 h-3.5" /> Clasificación y Destino
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                        <FormSelect
                            label="Categoría"
                            icon={<Tag className="text-indigo-500" />}
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
                            placeholder="Seleccione..."
                        />

                        <FormSelect
                            label="Orientación"
                            icon={<Tag className="text-amber-500" />}
                            value={formData.orientacion}
                            onChange={e => setFormData({ ...formData, orientacion: e.target.value })}
                            options={orientaciones.map(o => ({ value: o.id, label: o.nombre }))}
                            placeholder="No definida"
                        />

                        <FormSelect
                            label="Estado"
                            icon={<Tag className="text-emerald-500" />}
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            options={estados.map(e => ({ value: e.id, label: e.nombre }))}
                            placeholder="Seleccione..."
                        />

                        <FormSelect
                            label="Proceso"
                            icon={<Tag className="text-blue-500" />}
                            value={formData.proceso}
                            onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                            options={procesos.map(p => ({ value: p.id, label: p.nombre }))}
                            placeholder="Seleccione..."
                        />
                    </div>

                    <div className="pt-4">
                        <div className="space-y-2">
                            <MultiSearchableSelect
                                label="Alcance: Establecimientos Asociados"
                                icon={<Building2 className="w-3.5 h-3.5" />}
                                options={establecimientos.map(e => ({ value: e.id, label: e.nombre }))}
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
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            Defina qué instituciones están cubiertas por este convenio para facilitar futuras recepciones.
                        </p>
                    </div>
                </div>

                {/* Section: Plazos */}
                <div className="space-y-6">
                    <h4 className="form-section-header">
                        <Calendar className="w-3.5 h-3.5" /> Plazos y Vigencia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <DateInput
                            label="Fecha Adjudicación"
                            required
                            value={formData.fecha_adjudicacion}
                            onChange={val => setFormData({ ...formData, fecha_adjudicacion: val })}
                        />

                        <DateInput
                            label="Fecha Inicio"
                            required
                            value={formData.fecha_inicio}
                            onChange={val => setFormData({ ...formData, fecha_inicio: val })}
                        />

                        <DateInput
                            label="Fecha Término"
                            required
                            value={formData.fecha_termino}
                            onChange={val => setFormData({ ...formData, fecha_termino: val })}
                        />
                    </div>
                </div>

                {/* Note */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                        El plazo total será calculado automáticamente por el sistema basándose en las fechas de vigencia ingresadas una vez guardado el contrato.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ContractModal;
