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
            <div className="space-y-6">
                {/* Section: Identificación */}
                <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-1.5 select-none">
                        <Hash className="w-3.5 h-3.5" /> <span>Identificación del Activo</span>
                    </h4>
                    
                    <div className="space-y-3.5">
                        {/* Grid 100% Sincronizado */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Columna Izquierda: Tipo de Activo */}
                            <div className="space-y-1 flex flex-col">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 select-none">
                                    Tipo de Activo <span className="text-red-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={tipoOptions}
                                    value={formData.tipo}
                                    onChange={val => setFormData({ ...formData, tipo: val })}
                                    placeholder={loadingTypes ? "Cargando..." : "Seleccione tipo..."}
                                    icon={Type}
                                />
                            </div>

                            {/* Columna Derecha: Código de Inventario */}
                            <div className="space-y-1 flex flex-col">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 select-none">
                                    Código de Inventario <span className="text-slate-400 font-normal">(Opcional)</span>
                                </label>
                                <div className="relative">
                                    <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="EJ: S/N..."
                                        className="no-global w-full pl-10 pr-4 h-10 text-[10px] font-bold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-350 uppercase"
                                        value={formData.codigo_inventario}
                                        onChange={e => setFormData({ ...formData, codigo_inventario: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nombre / Descripción */}
                        <div className="space-y-1 flex flex-col">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 select-none">
                                Nombre / Descripción <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    required
                                    placeholder="EJ: PROYECTOR EPSON X10..."
                                    className="no-global w-full pl-10 pr-4 h-10 text-[10px] font-bold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-355 uppercase"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Establecimiento Base */}
                        <div className="space-y-1 flex flex-col">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 select-none">
                                Establecimiento Base <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                options={establishmentOptions}
                                value={formData.establecimiento}
                                onChange={val => setFormData({ ...formData, establecimiento: val })}
                                placeholder="Seleccione establecimiento..."
                                icon={Building}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Ubicación */}
                <div className="space-y-3.5">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-1.5 select-none">
                        <MapPin className="w-3.5 h-3.5" /> <span>Ubicación Física</span>
                    </h4>
                    <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 select-none">
                            Bodega / Estante <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="EJ: CASILLERO 4A..."
                                className="no-global w-full pl-10 pr-4 h-10 text-[10px] font-bold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-355 uppercase"
                                value={formData.ubicacion}
                                onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper Note */}
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 select-none">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-blue-700 leading-relaxed font-medium uppercase tracking-wide">
                        Administre sus activos de forma centralizada. Los tipos de activos pueden ser gestionados desde el panel de administración.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default AssetModal;
