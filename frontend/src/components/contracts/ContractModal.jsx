import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { FileText, Tag, Hash, Calendar, Info, Building2, DollarSign, Trash2, Plus, ShoppingBag } from 'lucide-react';
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
        cdp: '',
        proveedores_asociados: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddProvider = () => {
        setFormData(prev => ({
            ...prev,
            proveedores_asociados: [...(prev.proveedores_asociados || []), { proveedor: '', monto_adjudicado: '', monto_consumido_previo: '', establecimientos: [] }]
        }));
    };

    const handleRemoveProvider = (index) => {
        setFormData(prev => ({
            ...prev,
            proveedores_asociados: prev.proveedores_asociados.filter((_, i) => i !== index)
        }));
    };

    const handleProviderChange = (index, field, value) => {
        setFormData(prev => {
            const newProviders = [...(prev.proveedores_asociados || [])];
            newProviders[index] = { ...newProviders[index], [field]: value };
            return { ...prev, proveedores_asociados: newProviders };
        });
    };

    const handleBulkSelect = (index, type) => {
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
        setFormData(prev => {
            const newProviders = [...(prev.proveedores_asociados || [])];
            newProviders[index] = { ...newProviders[index], establecimientos: selectedIds };
            return { ...prev, proveedores_asociados: newProviders };
        });
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
            <div className="space-y-10 px-1 py-2">
                
                {/* Section 1: Información General */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        1. Información General
                    </h4>
                    
                    <FormInput
                        label="Nombre / Descripción Corta del Proceso"
                        required
                        placeholder="Ej: Adquisición de materiales de oficina..."
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="Código Mercado Público"
                            required
                            placeholder="Ej: 1234-56-LP24"
                            value={formData.codigo_mercado_publico}
                            onChange={e => setFormData({ ...formData, codigo_mercado_publico: e.target.value })}
                        />
                        <FormInput
                            label="Nº CDP"
                            placeholder="Certificado de Disponibilidad..."
                            value={formData.cdp}
                            onChange={e => setFormData({ ...formData, cdp: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section 2: Clasificación y Plazos */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        2. Clasificación y Plazos
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormSelect
                            label="Categoría"
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            options={(categorias || []).map(c => ({ value: c.id, label: c.nombre }))}
                            placeholder="Seleccione..."
                        />
                        <FormSelect
                            label="Proceso"
                            value={formData.proceso}
                            onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                            options={(procesos || []).map(p => ({ value: p.id, label: p.nombre }))}
                            placeholder="Seleccione..."
                        />
                        <FormSelect
                            label="Orientación"
                            value={formData.orientacion}
                            onChange={e => setFormData({ ...formData, orientacion: e.target.value })}
                            options={(orientaciones || []).map(o => ({ value: o.id, label: o.nombre }))}
                            placeholder="No definida"
                        />
                        <FormSelect
                            label="Estado"
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            options={(estados || []).map(e => ({ value: e.id, label: e.nombre }))}
                            placeholder="Seleccione..."
                        />
                    </div>

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

                {/* Section 3: Proveedores */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-bold text-slate-800">
                            3. Proveedores Adjudicados
                        </h4>
                        <button
                            type="button"
                            onClick={handleAddProvider}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Añadir Proveedor
                        </button>
                    </div>
                    
                    {(formData.proveedores_asociados || []).length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center">
                            <span className="text-sm text-slate-500">No hay proveedores asignados. Haz clic en "Añadir Proveedor".</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(formData.proveedores_asociados || []).map((prov, index) => (
                                <div key={index} className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative group">
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveProvider(index)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Eliminar Proveedor"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pr-8">
                                        <div className="md:col-span-6">
                                            <SearchableSelect
                                                label={`Proveedor ${index + 1}`}
                                                options={(proveedores || []).map(p => ({ value: p.id, label: p.nombre }))}
                                                value={prov.proveedor}
                                                onChange={val => handleProviderChange(index, 'proveedor', val)}
                                                placeholder="Seleccione..."
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormInput
                                                label="Monto Adjudicado ($)"
                                                type="number"
                                                placeholder="Ej: 5000000"
                                                value={prov.monto_adjudicado}
                                                onChange={e => handleProviderChange(index, 'monto_adjudicado', e.target.value === '' ? '' : parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormInput
                                                label="Consumo Previo ($)"
                                                type="number"
                                                placeholder="Opcional"
                                                value={prov.monto_consumido_previo}
                                                onChange={e => handleProviderChange(index, 'monto_consumido_previo', e.target.value === '' ? '' : parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    {/* Establecimientos asociados al proveedor */}
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <div className="space-y-4">
                                            <MultiSearchableSelect
                                                label="Establecimientos Asignados a este Proveedor"
                                                options={(establecimientos || []).map(e => ({ value: e.id, label: e.nombre }))}
                                                value={prov.establecimientos || []}
                                                onChange={(val) => handleProviderChange(index, 'establecimientos', val)}
                                                placeholder="Seleccione establecimientos..."
                                            />
                                            
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'ALL')}
                                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                >
                                                    Todos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'ESTABLECIMIENTO')}
                                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                >
                                                    Escuelas/Liceos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'JARDIN')}
                                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                >
                                                    Jardines VTF
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'OFICINA')}
                                                    className="px-3 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                >
                                                    Oficina Central
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'CLEAR')}
                                                    className="px-3 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                                                >
                                                    Limpiar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Section 4: Orden de Compra */}
                <div className="space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                        4. Orden de Compra
                    </h4>

                    <div className="space-y-6 pt-2 max-w-md">
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-700">Tipo de Orden de Compra</label>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipo_oc"
                                        checked={formData.tipo_oc === 'UNICA'}
                                        onChange={() => setFormData({ ...formData, tipo_oc: 'UNICA' })}
                                        className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-700">OC Única</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="tipo_oc"
                                        checked={formData.tipo_oc === 'MULTIPLE'}
                                        onChange={() => setFormData({ ...formData, tipo_oc: 'MULTIPLE' })}
                                        className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-sm text-slate-700">Múltiples OC (Por RC)</span>
                                </label>
                            </div>
                        </div>

                        {formData.tipo_oc === 'UNICA' && (
                            <FormInput
                                label="Nº Orden de Compra (General)"
                                placeholder="Ej: 1234-56-LP24"
                                value={formData.nro_oc}
                                onChange={e => setFormData({ ...formData, nro_oc: e.target.value })}
                            />
                        )}
                    </div>
                </div>

            </div>
        </BaseModal>
    );
};

export default ContractModal;
