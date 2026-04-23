import React, { useState, useEffect } from 'react';
import { User, AlertCircle, Users } from 'lucide-react';
import api from '../../api';
import { validateRut, formatRut } from '../../utils/rutValidator';
import BaseModal from '../common/BaseModal';

const FuncionarioModal = ({ isOpen, onClose, onSave, funcionarioId = null }) => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Options for selects
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        rut: '',
        nombre_funcionario: '',
        anexo: '',
        subdireccion: '',
        departamento: '',
        unidad: '',
        cargo: '',
        estado: true,
        grupos: []
    });

    useEffect(() => {
        if (isOpen) {
            fetchSubdirecciones();
            fetchGrupos();
            if (funcionarioId) {
                fetchFuncionario();
            } else {
                setFormData({
                    rut: '',
                    nombre_funcionario: '',
                    anexo: '',
                    subdireccion: '',
                    departamento: '',
                    unidad: '',
                    cargo: '',
                    estado: true,
                    grupos: []
                });
                setErrors({});
            }
        }
    }, [isOpen, funcionarioId]);

    const fetchSubdirecciones = async () => {
        try {
            const response = await api.get('subdirecciones/');
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setSubdirecciones(data);
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        }
    };

    const fetchGrupos = async () => {
        try {
            const response = await api.get('grupos/', { params: { page_size: 1000 } });
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setGrupos(data);
        } catch (error) {
            console.error('Error fetching grupos:', error);
        }
    };

    const fetchFuncionario = async () => {
        try {
            const response = await api.get(`funcionarios/${funcionarioId}/`);
            setFormData({
                ...response.data,
                grupos: response.data.grupos || []
            });

            // Load departments and units if they exist
            if (response.data.subdireccion) {
                await fetchDepartamentos(response.data.subdireccion);
            }
            if (response.data.departamento) {
                await fetchUnidades(response.data.departamento);
            }
        } catch (error) {
            console.error('Error fetching funcionario:', error);
        }
    };

    const fetchDepartamentos = async (subdireccionId) => {
        try {
            const response = await api.get(`departamentos/?subdireccion=${subdireccionId}`);
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setDepartamentos(data);
        } catch (error) {
            console.error('Error fetching departamentos:', error);
        }
    };

    const fetchUnidades = async (departamentoId) => {
        try {
            const response = await api.get(`unidades/?departamento=${departamentoId}`);
            const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setUnidades(data);
        } catch (error) {
            console.error('Error fetching unidades:', error);
        }
    };

    const handleSubdireccionChange = async (e) => {
        const subdireccionId = e.target.value;
        setFormData({
            ...formData,
            subdireccion: subdireccionId,
            departamento: '',
            unidad: ''
        });
        setDepartamentos([]);
        setUnidades([]);

        if (subdireccionId) {
            await fetchDepartamentos(subdireccionId);
        }
    };

    const handleDepartamentoChange = async (e) => {
        const departamentoId = e.target.value;
        setFormData({
            ...formData,
            departamento: departamentoId,
            unidad: ''
        });
        setUnidades([]);

        if (departamentoId) {
            await fetchUnidades(departamentoId);
        }
    };

    const handleRutChange = (e) => {
        const value = e.target.value;
        const formatted = formatRut(value);
        setFormData({ ...formData, rut: formatted });

        if (formatted.length >= 3) {
            const validation = validateRut(formatted);
            if (!validation.valid) {
                setErrors(prev => ({ ...prev, rut: validation.error }));
            } else {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.rut;
                    return newErrors;
                });
            }
        }
    };

    const handleGrupoToggle = (grupoId) => {
        const currentGrupos = [...formData.grupos];
        const index = currentGrupos.indexOf(grupoId);
        if (index === -1) {
            currentGrupos.push(grupoId);
        } else {
            currentGrupos.splice(index, 1);
        }
        setFormData({ ...formData, grupos: currentGrupos });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({});

        const rutValidation = validateRut(formData.rut);
        if (!rutValidation.valid) {
            setErrors({ rut: rutValidation.error });
            setLoading(false);
            return;
        }

        try {
            const dataToSend = {
                ...formData,
                subdireccion: formData.subdireccion || null,
                departamento: formData.departamento || null,
                unidad: formData.unidad || null,
                grupos: formData.grupos
            };

            if (funcionarioId) {
                await api.put(`funcionarios/${funcionarioId}/`, dataToSend);
            } else {
                await api.post('funcionarios/', dataToSend);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
            if (error.response?.data) {
                setErrors(error.response.data);
            } else {
                alert('Error al guardar el funcionario');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSubmit}
            title={funcionarioId ? 'Editar Funcionario' : 'Nuevo Funcionario'}
            subtitle="Completa la información del personal del SLEP"
            icon={User}
            loading={loading}
            maxWidth="max-w-4xl"
            saveLabel={funcionarioId ? 'Guardar Cambios' : 'Crear Funcionario'}
        >
            <div className="space-y-6">
                {/* Personal Information */}
                <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Información Personal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">RUT</label>
                            <input
                                type="text"
                                value={formData.rut}
                                onChange={handleRutChange}
                                placeholder="12345678-9"
                                className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all outline-none ${errors.rut ? 'border-red-200' : 'border-slate-100 focus:border-blue-500'}`}
                                required
                            />
                            {errors.rut && (
                                <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1 font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.rut}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                value={formData.nombre_funcionario}
                                onChange={(e) => setFormData({ ...formData, nombre_funcionario: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                placeholder="EJ: JUAN PÉREZ"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Organizational Location */}
                <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ubicación Organizacional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Subdirección</label>
                            <select
                                value={formData.subdireccion || ''}
                                onChange={handleSubdireccionChange}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none"
                            >
                                <option value="">Seleccionar...</option>
                                {subdirecciones.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Departamento</label>
                            <select
                                value={formData.departamento || ''}
                                onChange={handleDepartamentoChange}
                                disabled={!formData.subdireccion}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none disabled:opacity-50 disabled:bg-slate-100"
                            >
                                <option value="">Seleccionar...</option>
                                {departamentos.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Unidad</label>
                            <select
                                value={formData.unidad || ''}
                                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                                disabled={!formData.departamento}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none appearance-none disabled:opacity-50 disabled:bg-slate-100"
                            >
                                <option value="">Seleccionar...</option>
                                {unidades.map(unid => (
                                    <option key={unid.id} value={unid.id}>{unid.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Labor Information & Groups */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Información Laboral</h4>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Cargo</label>
                                <input
                                    type="text"
                                    value={formData.cargo}
                                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value.toUpperCase() })}
                                    placeholder="EJ: PROFESIONAL"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Anexo</label>
                                <input
                                    type="text"
                                    value={formData.anexo}
                                    onChange={(e) => setFormData({ ...formData, anexo: e.target.value })}
                                    placeholder="123"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                />
                                <p className="text-xs text-slate-400 ml-2 italic">
                                    Número público: {formData.anexo ? `227263${formData.anexo}` : 'Sin anexo'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                <input
                                    type="checkbox"
                                    id="estado"
                                    checked={formData.estado}
                                    onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500"
                                />
                                <label htmlFor="estado" className="text-sm font-bold text-slate-700">Funcionario Activo</label>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Asignación de Grupos
                            </h4>
                            <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {grupos.map(grupo => (
                                    <div
                                        key={grupo.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${formData.grupos.includes(grupo.id) ? 'bg-blue-50 border-blue-100' : 'hover:bg-white'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`grupo-${grupo.id}`}
                                            checked={formData.grupos.includes(grupo.id)}
                                            onChange={() => handleGrupoToggle(grupo.id)}
                                            className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500"
                                        />
                                        <label htmlFor={`grupo-${grupo.id}`} className="text-sm font-semibold text-slate-700 flex-grow cursor-pointer">
                                            {grupo.nombre}
                                            {grupo.jefe === formData.id && (
                                                <span className="ml-2 text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">Jefe</span>
                                            )}
                                        </label>
                                    </div>
                                ))}
                                {grupos.length === 0 && (
                                    <p className="text-sm text-slate-400 italic text-center py-4">No hay grupos disponibles</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default FuncionarioModal;
