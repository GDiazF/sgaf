import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, Search, Plus, X, Key, UserPlus, Check, Building } from 'lucide-react';
import ApplicantModal from '../../components/applicants/ApplicantModal';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';

const LoanForm = () => {
    const navigate = useNavigate();

    // Key Selection State
    const [establishments, setEstablishments] = useState([]);
    const [selectedEst, setSelectedEst] = useState('');
    const [keySearchTerm, setKeySearchTerm] = useState('');
    const [foundKeys, setFoundKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);

    // Applicant Selection State
    const [rutSearch, setRutSearch] = useState('');
    const [applicant, setApplicant] = useState(null);
    const [newApplicantData, setNewApplicantData] = useState(null);

    const [observacion, setObservacion] = useState('');

    useEffect(() => {
        api.get('establecimientos/').then(res => {
            // Handle pagination for dropdown (might need fetching all if > 10, but MVP fix for crash)
            setEstablishments(res.data.results || res.data);
        });
    }, []);

    // Search keys when term changes or establishment changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            let query = 'llaves/?';
            if (selectedEst) query += `establecimiento=${selectedEst}&`;
            if (keySearchTerm.length > 0) query += `search=${keySearchTerm}`;

            // Only search if we have an establishment selected OR a search term > 1 char
            if (selectedEst || keySearchTerm.length > 1) {
                api.get(query)
                    .then(res => setFoundKeys(res.data.results || res.data || []))
                    .catch(console.error);
            } else {
                setFoundKeys([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [keySearchTerm, selectedEst]);

    const handleAddKey = (key) => {
        if (!selectedKeys.find(k => k.id === key.id)) {
            setSelectedKeys([...selectedKeys, key]);
        }
    };

    const handleRemoveKey = (id) => {
        setSelectedKeys(selectedKeys.filter(k => k.id !== id));
    };

    const searchApplicant = async () => {
        if (!rutSearch) return;
        try {
            const res = await api.get(`solicitantes/?search=${rutSearch}`);
            const results = res.data.results || res.data || [];

            if (results.length > 0) {
                const match = results.find(a => a.rut === rutSearch) || results[0];
                setApplicant(match);
                setNewApplicantData(null);
            } else {
                setApplicant(null);
                setNewApplicantData({ rut: rutSearch, nombre: '', apellido: '', telefono: '', email: '' });
            }
        } catch (error) {
            console.error(error);
            alert("Error al buscar solicitante");
        }
    };

    const handleSaveApplicant = async (data) => {
        try {
            const res = await api.post('solicitantes/', data);
            setApplicant(res.data);
            setNewApplicantData(null);
            setRutSearch(res.data.rut);
        } catch (error) {
            console.error(error);
            alert("Error al crear solicitante. Verifique los datos.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedKeys.length === 0) {
            alert("Debe seleccionar al menos una llave");
            return;
        }
        if (!applicant) {
            alert("Debe seleccionar un solicitante");
            return;
        }

        const payload = {
            solicitante: applicant.id,
            llaves: selectedKeys.map(k => k.id),
            observacion: observacion
        };

        try {
            await api.post('prestamos/', payload);
            navigate('/');
        } catch (error) {
            console.error("Error creating loan:", error);
            alert("Error al crear el préstamo");
        }
    };

    return (
        <div className="max-w-4xl mx-auto pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: Key Selection */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Key className="w-5 h-5 text-blue-500" />
                            1. Seleccionar Llaves
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Establishment Select */}
                        <FormSelect
                            label="Filtrar por Establecimiento"
                            id="est_filter"
                            icon={Building}
                            value={selectedEst}
                            onChange={e => setSelectedEst(e.target.value)}
                            options={establishments.map(est => ({ value: est.id, label: est.nombre }))}
                            placeholder="Todos los establecimientos"
                        />

                        <FormInput
                            placeholder="Buscar llave por nombre..."
                            icon={Search}
                            value={keySearchTerm}
                            onChange={e => setKeySearchTerm(e.target.value)}
                        />

                        {/* Search Results */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-inner max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {foundKeys.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">
                                    {selectedEst || keySearchTerm ? 'No se encontraron llaves' : 'Seleccione establecimiento o busque por nombre'}
                                </div>
                            ) : (
                                foundKeys.map(k => (
                                    <button
                                        key={k.id}
                                        onClick={() => handleAddKey(k)}
                                        disabled={!k.disponible}
                                        className={`w-full text-left p-3 flex justify-between items-center group transition-colors border-b border-slate-50 last:border-0 ${!k.disponible ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:bg-indigo-50 cursor-pointer'}`}
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{k.nombre}</p>
                                            <p className="text-xs text-slate-500">{k.establecimiento_nombre}</p>
                                        </div>
                                        {k.disponible ? (
                                            <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                                        ) : (
                                            <div className="text-right">
                                                <span className="block text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mb-0.5">
                                                    En Préstamo
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {k.solicitante_actual || 'Desconocido'}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Selected List */}
                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Llaves seleccionadas ({selectedKeys.length})</p>
                            {selectedKeys.length === 0 ? (
                                <div className="text-sm text-slate-400 italic p-4 bg-slate-50 rounded-lg text-center border border-slate-100 border-dashed">
                                    No hay llaves seleccionadas
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedKeys.map(k => (
                                        <div key={k.id} className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100 animate-fade-in-up">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                                                    <Key className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-indigo-900">{k.nombre}</p>
                                                    <p className="text-xs text-indigo-600/70">{k.establecimiento_nombre}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveKey(k.id)}
                                                className="text-indigo-400 hover:text-red-500 p-1 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Applicant & Submit */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-500" />
                                2. Solicitante
                            </h2>
                        </div>

                        <div className="p-6">
                            <ApplicantModal
                                isOpen={!!newApplicantData}
                                onClose={() => setNewApplicantData(null)}
                                onSave={handleSaveApplicant}
                                initialData={newApplicantData}
                            />
                            {!applicant ? (
                                <div className="flex gap-2 items-end">
                                    <FormInput
                                        placeholder="Ingresar RUT o Nombre"
                                        icon={Search}
                                        className="flex-1"
                                        inputClassName="font-mono"
                                        value={rutSearch}
                                        onChange={e => setRutSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && searchApplicant()}
                                    />
                                    <button
                                        onClick={searchApplicant}
                                        className="h-[46px] bg-slate-900 text-white px-6 rounded-2xl hover:bg-slate-800 font-bold transition-all shadow-lg flex items-center justify-center text-sm"
                                    >
                                        Buscar
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center animate-fade-in-up">
                                    <div>
                                        <p className="text-green-800 font-bold">{applicant.nombre} {applicant.apellido}</p>
                                        <p className="text-green-600 text-sm font-mono">{applicant.rut}</p>
                                    </div>
                                    <button onClick={() => setApplicant(null)} className="text-green-600 hover:text-green-800 bg-white p-1 rounded-full shadow-sm transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <FormInput
                            label="Observación (Opcional)"
                            placeholder="Notas adicionales..."
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            multiline
                            rows="2"
                        />

                        <button
                            onClick={handleSubmit}
                            disabled={!applicant || selectedKeys.length === 0}
                            className="w-full mt-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all font-bold text-lg flex items-center justify-center gap-2"
                        >
                            <Save className="w-6 h-6" />
                            Registrar Préstamo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanForm;
