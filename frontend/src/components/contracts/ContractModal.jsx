import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Trash2, Plus } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';
import MultiSearchableSelect from '../common/MultiSearchableSelect';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';

const CONTRACT_INPUT_CLASS =
    'no-global !w-full !h-10 !min-h-10 !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-0 !rounded-xl !outline-none focus:!border-blue-500 uppercase !transition-all !shadow-sm placeholder:!text-slate-300';

const CONTRACT_SELECT_CLASS =
    "no-global !w-full !h-10 !min-h-10 !text-[10px] !font-black uppercase tracking-widest !px-3 !py-0 !rounded-xl !border !border-slate-200 !outline-none cursor-pointer appearance-none !bg-white !text-slate-700 focus:!border-blue-500 !shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

const BULK_BUTTON_CLASS =
    'h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 border border-transparent transition-colors';

const SectionHeader = ({ number, title, action }) => (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {number}. {title}
        </h4>
        {action}
    </div>
);

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
            maxWidth="max-w-3xl"
            saveLabel={editingId ? 'Actualizar Contrato' : 'Guardar Contrato'}
        >
            <div className="space-y-10 px-1 py-2">
                
                {/* Section 1: Información General */}
                <div className="space-y-5">
                    <SectionHeader number="1" title="Información General" />
                    
                    <FormInput
                        label="Nombre / Descripción Corta del Proceso"
                        required
                        placeholder="Ej: Adquisición de materiales de oficina..."
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        inputClassName={CONTRACT_INPUT_CLASS}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="Código Mercado Público"
                            required
                            placeholder="Ej: 1234-56-LP24"
                            value={formData.codigo_mercado_publico}
                            onChange={e => setFormData({ ...formData, codigo_mercado_publico: e.target.value })}
                            inputClassName={CONTRACT_INPUT_CLASS}
                        />
                        <FormInput
                            label="Nº CDP"
                            placeholder="Certificado de Disponibilidad..."
                            value={formData.cdp}
                            onChange={e => setFormData({ ...formData, cdp: e.target.value })}
                            inputClassName={CONTRACT_INPUT_CLASS}
                        />
                    </div>
                </div>

                {/* Section 2: Clasificación y Plazos */}
                <div className="space-y-5">
                    <SectionHeader number="2" title="Clasificación y Plazos" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormSelect
                            label="Categoría"
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            options={(categorias || []).map(c => ({ value: c.id, label: c.nombre }))}
                            placeholder="Seleccione..."
                            inputClassName={CONTRACT_SELECT_CLASS}
                        />
                        <FormSelect
                            label="Proceso"
                            value={formData.proceso}
                            onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                            options={(procesos || []).map(p => ({ value: p.id, label: p.nombre }))}
                            placeholder="Seleccione..."
                            inputClassName={CONTRACT_SELECT_CLASS}
                        />
                        <FormSelect
                            label="Orientación"
                            value={formData.orientacion}
                            onChange={e => setFormData({ ...formData, orientacion: e.target.value })}
                            options={(orientaciones || []).map(o => ({ value: o.id, label: o.nombre }))}
                            placeholder="No definida"
                            inputClassName={CONTRACT_SELECT_CLASS}
                        />
                        <FormSelect
                            label="Estado"
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            options={(estados || []).map(e => ({ value: e.id, label: e.nombre }))}
                            placeholder="Seleccione..."
                            inputClassName={CONTRACT_SELECT_CLASS}
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
                    <SectionHeader
                        number="3"
                        title="Proveedores Adjudicados"
                        action={
                            <button
                                type="button"
                                onClick={handleAddProvider}
                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 inline-flex items-center gap-2 shrink-0 active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Añadir
                            </button>
                        }
                    />
                    
                    {(formData.proveedores_asociados || []).length === 0 ? (
                        <div className="p-6 bg-blue-50/40 border border-blue-100 border-dashed rounded-2xl text-center">
                            <span className="text-sm text-blue-600 font-bold">No hay proveedores asignados. Haz clic en "Añadir".</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(formData.proveedores_asociados || []).map((prov, index) => (
                                <div key={index} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative group hover:border-blue-200 transition-colors">
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveProvider(index)}
                                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                                                inputClassName={CONTRACT_INPUT_CLASS}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <FormInput
                                                label="Consumo Previo ($)"
                                                type="number"
                                                placeholder="Opcional"
                                                value={prov.monto_consumido_previo}
                                                onChange={e => handleProviderChange(index, 'monto_consumido_previo', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                inputClassName={CONTRACT_INPUT_CLASS}
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
                                                    className={BULK_BUTTON_CLASS}
                                                >
                                                    Todos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'ESTABLECIMIENTO')}
                                                    className={BULK_BUTTON_CLASS}
                                                >
                                                    Escuelas/Liceos
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'JARDIN')}
                                                    className={BULK_BUTTON_CLASS}
                                                >
                                                    Jardines VTF
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'OFICINA')}
                                                    className={BULK_BUTTON_CLASS}
                                                >
                                                    Oficina Central
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkSelect(index, 'CLEAR')}
                                                    className="h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
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
                    <SectionHeader number="4" title="Orden de Compra" />

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
                                inputClassName={CONTRACT_INPUT_CLASS}
                            />
                        )}
                    </div>
                </div>

            </div>
        </BaseModal>
    );
};

export default ContractModal;
