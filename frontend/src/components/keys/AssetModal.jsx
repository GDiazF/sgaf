import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { Box, Building, MapPin, Hash, Info, QrCode, Type, Tag } from 'lucide-react';
import api from '../../api';
import SearchableSelect from '../common/SearchableSelect';

const AssetModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { establishments }
}) => {
    const [tipoOptions, setTipoOptions] = useState([]);
    const [loadingTypes, setLoadingTypes] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTypes();
        }
    }, [isOpen]);

    const fetchTypes = async () => {
        setLoadingTypes(true);
        try {
            const response = await api.get('tipo-activos/');
            const options = response.data.map(t => ({
                value: t.id,
                label: t.nombre
            }));
            setTipoOptions(options);

            // If we're creating a new asset and have types, set the first one as default
            if (!editingId && !initialData && options.length > 0) {
                setFormData(prev => ({ ...prev, tipo: options[0].value }));
            }
        } catch (error) {
            console.error("Error fetching types:", error);
        } finally {
            setLoadingTypes(false);
        }
    };

    const establishmentOptions = (establishments || []).map(est => ({
        value: est.id,
        label: est.nombre
    }));

    const [formData, setFormData] = useState({
        tipo: '',
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
                tipo: tipoOptions.length > 0 ? tipoOptions[0].value : '',
                nombre: '',
                codigo_inventario: '',
                establecimiento: '',
                ubicacion: ''
            });
        }
    }, [initialData, isOpen, tipoOptions]);

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="form-container">
                                <SearchableSelect
                                    label="Tipo de Activo"
                                    required
                                    options={tipoOptions}
                                    value={formData.tipo}
                                    onChange={val => setFormData({ ...formData, tipo: val })}
                                    placeholder={loadingTypes ? "Cargando..." : "Seleccione tipo..."}
                                    icon={Type}
                                    className="!m-0"
                                />
                            </div>

                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-xs font-bold text-slate-600 ml-1">Código de Inventario <span className="text-slate-400 font-normal">(Opcional)</span></label>
                                <div className="relative">
                                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Ej: S/N..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                        value={formData.codigo_inventario}
                                        onChange={e => setFormData({ ...formData, codigo_inventario: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nombre / Descripción <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Proyector Epson X10..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium h-[46px]"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                        </div>

                        <SearchableSelect
                            label="Establecimiento Base"
                            required
                            options={establishmentOptions}
                            value={formData.establecimiento}
                            onChange={val => setFormData({ ...formData, establecimiento: val })}
                            placeholder="Seleccione establecimiento..."
                            icon={Building}
                        />
                    </div>
                </div>

                {/* Section: Ubicación */}
                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Ubicación Física
                    </h4>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Bodega / Estante <span className="text-slate-400 font-normal">(Opcional)</span></label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Ej: Casillero 4A..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm font-medium h-[46px]"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper Note */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        Administre sus activos de forma centralizada. Los tipos de activos pueden ser gestionados desde el panel de administración.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};


export default AssetModal;
