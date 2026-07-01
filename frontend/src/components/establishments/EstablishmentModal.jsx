import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Camera, Image as ImageIcon, Info } from 'lucide-react';
import { BTN_SECONDARY } from '../../pages/funcionarios/shared/funcionariosUi';
import {
    BTN_BLUE_SM, INPUT_FORM, SELECT_FORM, INFO_BANNER, INFO_BANNER_TEXT, INFO_BANNER_ICON,
} from '../../pages/establishments/establishmentsUi';

const LABEL = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const SECTION = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest';

const EstablishmentModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    establishmentTypes = [],
}) => {
    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: '',
        direccion: '',
        director: '',
        email: '',
        url_web: '',
        latitud: '',
        longitud: '',
        activo: true,
        telefono_principal: '',
    });
    const [coordsString, setCoordsString] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            const principal = initialData.telefonos?.find(p => p.es_principal) || initialData.telefonos?.[0];
            setFormData({
                ...initialData,
                telefono_principal: principal ? principal.numero : '',
            });
            setCoordsString(
                initialData.latitud && initialData.longitud
                    ? `${initialData.latitud}, ${initialData.longitud}`
                    : ''
            );
            setLogoPreview(initialData.logo);
            setLogoFile(null);
        } else {
            setFormData({
                rbd: '',
                nombre: '',
                tipo: establishmentTypes.length > 0 ? establishmentTypes[0].id : '',
                direccion: '',
                director: '',
                email: '',
                url_web: '',
                latitud: '',
                longitud: '',
                activo: true,
                telefono_principal: '',
            });
            setCoordsString('');
            setLogoPreview(null);
            setLogoFile(null);
        }
    }, [initialData, isOpen, establishmentTypes]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleCoordsChange = (value) => {
        setCoordsString(value);
        const parts = value.split(',').map(p => p.trim());
        if (parts.length === 2) {
            setFormData(prev => ({ ...prev, latitud: parts[0], longitud: parts[1] }));
        } else if (value === '') {
            setFormData(prev => ({ ...prev, latitud: '', longitud: '' }));
        }
    };

    const handleFormSave = (e) => {
        e.preventDefault();
        const data = { ...formData };
        if (logoFile) data.logo = logoFile;
        onSave(data);
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 12 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                        className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl border border-slate-200 max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                    <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-start shrink-0 gap-3">
                        <div className="min-w-0">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                {editingId ? 'Editar establecimiento' : 'Nuevo establecimiento'}
                            </h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Información base de la institución educativa
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleFormSave} className="flex flex-col flex-1 min-h-0">
                        <div className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <p className={`${SECTION} mb-3`}>Identificación</p>
                                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div className="relative group shrink-0 mx-auto sm:mx-0">
                                        <div className="w-24 h-24 rounded-2xl border-2 border-white shadow-md overflow-hidden bg-white flex items-center justify-center">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-300">
                                                    <ImageIcon className="w-8 h-8" />
                                                    <span className="text-[8px] font-bold uppercase mt-1">Sin logo</span>
                                                </div>
                                            )}
                                            <label className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white rounded-2xl">
                                                <Camera className="w-5 h-5 mb-0.5" />
                                                <span className="text-[8px] font-black uppercase">Cambiar</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4 min-w-0 w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className={LABEL}>RBD nacional *</label>
                                                <input
                                                    type="number"
                                                    required
                                                    className={INPUT_FORM}
                                                    placeholder="Ej: 12345"
                                                    value={formData.rbd}
                                                    onChange={e => setFormData({ ...formData, rbd: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Tipo de institución *</label>
                                                <select
                                                    required
                                                    className={SELECT_FORM}
                                                    value={formData.tipo}
                                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {establishmentTypes.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={LABEL}>Nombre oficial *</label>
                                            <input
                                                type="text"
                                                required
                                                className={INPUT_FORM}
                                                placeholder="Nombre completo de la institución"
                                                value={formData.nombre}
                                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className={`${SECTION} mb-3`}>Contacto</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL}>Director/a</label>
                                        <input
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Nombre del directivo"
                                            value={formData.director}
                                            onChange={e => setFormData({ ...formData, director: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Correo institucional</label>
                                        <input
                                            type="email"
                                            className={INPUT_FORM}
                                            placeholder="ejemplo@slep.cl"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Página web</label>
                                        <input
                                            type="url"
                                            className={INPUT_FORM}
                                            placeholder="https://www.ejemplo.cl"
                                            value={formData.url_web || ''}
                                            onChange={e => setFormData({ ...formData, url_web: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Teléfono principal</label>
                                        <input
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Ej: +56 9 1234 5678"
                                            value={formData.telefono_principal}
                                            onChange={e => setFormData({ ...formData, telefono_principal: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className={`mt-3 ${INFO_BANNER}`}>
                                    <Info className={INFO_BANNER_ICON} />
                                    <p className={INFO_BANNER_TEXT}>
                                        Teléfonos adicionales se gestionan desde el ícono de teléfono en el listado.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className={`${SECTION} mb-3`}>Ubicación</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={LABEL}>Dirección física</label>
                                        <input
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Calle, número, comuna"
                                            value={formData.direccion}
                                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Coordenadas GPS (lat, long)</label>
                                        <input
                                            type="text"
                                            className={INPUT_FORM}
                                            placeholder="Ej: -20.21, -70.14"
                                            value={coordsString}
                                            onChange={e => handleCoordsChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className={`${SECTION} mb-3`}>Estado</p>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${formData.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${formData.activo ? 'translate-x-6' : 'translate-x-1'}`}
                                        />
                                    </button>
                                    <div>
                                        <span className={`text-[11px] font-medium uppercase tracking-tighter ${formData.activo ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {formData.activo ? 'Operativo' : 'Fuera de servicio'}
                                        </span>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            Visibilidad en el sistema
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2 shrink-0">
                            <button type="button" onClick={onClose} className={BTN_SECONDARY}>
                                Cancelar
                            </button>
                            <button type="submit" className={BTN_BLUE_SM}>
                                <Plus className="w-4 h-4 shrink-0" />
                                {editingId ? 'Actualizar' : 'Registrar'}
                            </button>
                        </div>
                    </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default EstablishmentModal;
