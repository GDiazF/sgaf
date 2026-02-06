import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Save, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api';
import { validateRut, formatRut } from '../../utils/rutValidator';

const FuncionarioForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Opciones para selects
    const [subdirecciones, setSubdirecciones] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [unidades, setUnidades] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        rut: '',
        nombre_funcionario: '',
        anexo: '',
        subdireccion: '',
        departamento: '',
        unidad: '',
        cargo: '',
        estado: true
    });

    useEffect(() => {
        fetchSubdirecciones();
        if (id) {
            fetchFuncionario();
        }
    }, [id]);

    const fetchSubdirecciones = async () => {
        try {
            const response = await api.get('subdirecciones/');
            setSubdirecciones(response.data);
        } catch (error) {
            console.error('Error fetching subdirecciones:', error);
        }
    };

    const fetchFuncionario = async () => {
        try {
            const response = await api.get(`funcionarios/${id}/`);
            setFormData(response.data);

            // Cargar departamentos y unidades si existen
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
            setDepartamentos(response.data);
        } catch (error) {
            console.error('Error fetching departamentos:', error);
        }
    };

    const fetchUnidades = async (departamentoId) => {
        try {
            const response = await api.get(`unidades/?departamento=${departamentoId}`);
            setUnidades(response.data);
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

        // Validar RUT
        if (formatted.length >= 3) {
            const validation = validateRut(formatted);
            if (!validation.valid) {
                setErrors({ ...errors, rut: validation.error });
            } else {
                const newErrors = { ...errors };
                delete newErrors.rut;
                setErrors(newErrors);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Validar RUT
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
            };

            if (id) {
                await api.put(`funcionarios/${id}/`, dataToSend);
            } else {
                await api.post('funcionarios/', dataToSend);
            }
            navigate('/funcionarios/list');
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
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <User className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">
                        {id ? 'Editar' : 'Nuevo'} Funcionario
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información Personal */}
                    <div className="border-b pb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Personal</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    RUT <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.rut}
                                    onChange={handleRutChange}
                                    placeholder="12345678-9"
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.rut ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    required
                                />
                                {errors.rut && (
                                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.rut}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre Completo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.nombre_funcionario}
                                    onChange={(e) => setFormData({ ...formData, nombre_funcionario: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contacto */}
                    <div className="border-b pb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Contacto</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Anexo</label>
                                <input
                                    type="text"
                                    value={formData.anexo}
                                    onChange={(e) => setFormData({ ...formData, anexo: e.target.value })}
                                    placeholder="123"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Número público: {formData.anexo ? `227263${formData.anexo}` : 'Sin anexo'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ubicación Organizacional */}
                    <div className="border-b pb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ubicación Organizacional</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subdirección</label>
                                <select
                                    value={formData.subdireccion}
                                    onChange={handleSubdireccionChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar...</option>
                                    {subdirecciones.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                                <select
                                    value={formData.departamento}
                                    onChange={handleDepartamentoChange}
                                    disabled={!formData.subdireccion}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">Seleccionar...</option>
                                    {departamentos.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                <select
                                    value={formData.unidad}
                                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                                    disabled={!formData.departamento}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">Seleccionar...</option>
                                    {unidades.map(unid => (
                                        <option key={unid.id} value={unid.id}>{unid.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Información Laboral */}
                    <div className="border-b pb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Laboral</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                                <input
                                    type="text"
                                    value={formData.cargo}
                                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                    placeholder="Ej: Profesional, Técnico, Administrativo"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center pt-6">
                                <input
                                    type="checkbox"
                                    checked={formData.estado}
                                    onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label className="ml-2 text-sm font-medium text-gray-700">Funcionario Activo</label>
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-4 justify-end pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/funcionarios/list')}
                            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2"
                        >
                            <X className="w-5 h-5" />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default FuncionarioForm;
