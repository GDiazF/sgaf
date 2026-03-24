import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Box, Building, MapPin, Hash, Info, QrCode, Type, Tag } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

const AssetModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { establishments }
}) => {
    const establishmentOptions = (establishments || []).map(est => ({
        value: est.id,
        label: est.nombre
    }));

    const tipoOptions = [
        { value: 'LLAVE', label: 'Llave / Llavero' },
        { value: 'PROYECTOR', label: 'Proyector' },
        { value: 'NOTEBOOK', label: 'Notebook / Computador' },
        { value: 'OTRO', label: 'Otro' }
    ];

    const [formData, setFormData] = useState({
        tipo: 'LLAVE',
        nombre: '',
        codigo_inventario: '',
        establecimiento: '',
        ubicacion: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                tipo: 'LLAVE',
                nombre: '',
                codigo_inventario: '',
                establecimiento: '',
                ubicacion: ''
            });
        }
    }, [initialData, isOpen]);

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Activo' : 'Registrar Nuevo Activo'}
            subtitle="Gestione el inventario de hardware y recursos físicos"
            icon={Box}
            saveLabel={editingId ? 'Actualizar Activo' : 'Registrar Activo'}
        >
            <div className="space-y-8">
                {/* Section: Identificación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Identificación del Activo
                    </h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect
                                label="Tipo de Activo"
                                required
                                options={tipoOptions}
                                value={formData.tipo}
                                onChange={val => setFormData({ ...formData, tipo: val })}
                                placeholder="Seleccione tipo..."
                                icon={Type}
                            />

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 ml-1">Código de Inventario <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                <div className="relative">
                                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Ej: S/N, Placa de Activo..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                        value={formData.codigo_inventario}
                                        onChange={e => setFormData({ ...formData, codigo_inventario: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombre / Descripción Corta <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Llavero de Aulas Sur, Proyector Epson X10..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                        </div>

                        <SearchableSelect
                            label="Establecimiento / Unidad Base"
                            required
                            options={establishmentOptions}
                            value={formData.establecimiento}
                            onChange={val => {
                                setFormData({
                                    ...formData,
                                    establecimiento: val
                                });
                            }}
                            placeholder="Seleccione el establecimiento..."
                            icon={Building}
                        />
                    </div>
                </div>

                {/* Section: Ubicación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Ubicación en Almacén
                    </h4>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Ubicación Física <span className="text-slate-400 font-normal">(Opcional)</span></label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Ej: Casillero 4A, Bodega Central..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper Note */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        Registre los activos que requieran ser prestados utilizando el módulo de préstamos. Puede definir sus tipos genéricos o cargar sus matrículas de inventario.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default AssetModal;
