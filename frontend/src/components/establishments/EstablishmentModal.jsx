import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import { School, Info, User, Mail, MapPin, Hash, Activity, Image as ImageIcon, Camera } from 'lucide-react';

const EstablishmentModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    establishmentTypes = []
}) => {
    const [formData, setFormData] = useState({
        rbd: '',
        nombre: '',
        tipo: '',
        direccion: '',
        director: '',
        email: '',
        latitud: '',
        longitud: '',
        activo: true
    });
    const [coordsString, setCoordsString] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setCoordsString(initialData.latitud && initialData.longitud ? `${initialData.latitud}, ${initialData.longitud}` : '');
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
                latitud: '',
                longitud: '',
                activo: true
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
        // Simple logic: if there is a comma, split and update lat/long
        const parts = value.split(',').map(p => p.trim());
        if (parts.length === 2) {
            setFormData(prev => ({
                ...prev,
                latitud: parts[0],
                longitud: parts[1]
            }));
        } else if (value === '') {
            setFormData(prev => ({
                ...prev,
                latitud: '',
                longitud: ''
            }));
        }
    };

    const handleFormSave = () => {
        const data = { ...formData };
        if (logoFile) {
            data.logo = logoFile;
        }
        onSave(data);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
            subtitle="Gestione la información base de la institución educativa"
            icon={School}
            saveLabel={editingId ? 'Actualizar Institución' : 'Registrar Institución'}
        >
            <div className="space-y-8">
                {/* Section: Logo y Identificación */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center relative">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-3" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-300">
                                        <ImageIcon className="w-10 h-10 mb-1" />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Sin Logo</span>
                                    </div>
                                )}
                                <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cambiar</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                                <Camera className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="RBD Nacional"
                                    icon={<Hash />}
                                    type="number"
                                    required
                                    placeholder="Ej: 12345"
                                    value={formData.rbd}
                                    onChange={e => setFormData({ ...formData, rbd: e.target.value })}
                                />
                                <FormSelect
                                    label="Tipo de Institución"
                                    icon={<Activity />}
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    options={establishmentTypes.map(t => ({ value: t.id, label: t.nombre }))}
                                    placeholder="Seleccionar tipo..."
                                />
                            </div>
                            <FormInput
                                label="Nombre Oficial del Establecimiento"
                                icon={<School />}
                                required
                                placeholder="Nombre completo de la institución..."
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Contacto y Ubicación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Director(a) / Responsable"
                        icon={User}
                        placeholder="Nombre del directivo..."
                        value={formData.director}
                        onChange={e => setFormData({ ...formData, director: e.target.value })}
                    />
                    <FormInput
                        label="Correo Institucional"
                        icon={Mail}
                        type="email"
                        placeholder="ejemplo@slep.cl"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <FormInput
                        label="Dirección Física"
                        icon={MapPin}
                        placeholder="Calle, número, comuna..."
                        className="md:col-span-2"
                        value={formData.direccion}
                        onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    />
                    <FormInput
                        label="Coordenadas GPS (Latitud, Longitud)"
                        icon={<Activity />}
                        placeholder="Pegue aquí las coordenadas de Google Maps (Ej: -20.21, -70.14)"
                        className="md:col-span-2"
                        value={coordsString}
                        onChange={e => handleCoordsChange(e.target.value)}
                    />
                </div>

                {/* Section: Estado */}
                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[24px] border border-slate-200 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${formData.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${formData.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div>
                        <span className={`text-sm font-black uppercase tracking-tight ${formData.activo ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {formData.activo ? 'Establecimiento Operativo' : 'Establecimiento Fuera de Servicio'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Control de visibilidad en el sistema global</p>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default EstablishmentModal;
