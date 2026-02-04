import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { FileText, Tag, Hash, Calendar, Info, Building2 } from 'lucide-react';
import DateInput from '../common/DateInput';
import SearchableSelect from '../common/SearchableSelect';

const ContractModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { procesos, estados, categorias, orientaciones, proveedores }
}) => {
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
        fecha_termino: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

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
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> IDENTIFICACIÓN DEL PROCESO
                    </h4>

                    <SearchableSelect
                        label="Proveedor Adjudicado"
                        options={proveedores ? proveedores.map(p => ({ value: p.id, label: p.nombre })) : []}
                        value={formData.proveedor}
                        onChange={val => setFormData({ ...formData, proveedor: val })}
                        placeholder="Seleccione Proveedor..."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Código Mercado Público</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: 1234-56-LP24"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.codigo_mercado_publico}
                                onChange={e => setFormData({ ...formData, codigo_mercado_publico: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombre / Descripción Corta</label>
                            <input
                                type="text"
                                required
                                placeholder="Nombre del servicio..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Clasificación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" /> Clasificación y Destino
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5 ">
                            <label className="text-xs font-bold text-slate-600 ml-1">Categoría</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer h-[46px] font-medium"
                                value={formData.categoria}
                                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Orientación</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer h-[46px] font-medium"
                                value={formData.orientacion}
                                onChange={e => setFormData({ ...formData, orientacion: e.target.value })}
                            >
                                <option value="">No definida</option>
                                {orientaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Estado</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer h-[46px] font-medium"
                                value={formData.estado}
                                onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Proceso</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm appearance-none focus:bg-white transition-all border-r-8 border-transparent cursor-pointer h-[46px] font-medium"
                                value={formData.proceso}
                                onChange={e => setFormData({ ...formData, proceso: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section: Plazos */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Plazos y Vigencia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
