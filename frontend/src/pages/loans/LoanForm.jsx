import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, Search, Plus, X, Key, UserPlus, Check, Building } from 'lucide-react';

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
    const [isCreatingApplicant, setIsCreatingApplicant] = useState(false);
    const [newApplicantData, setNewApplicantData] = useState({
        rut: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: ''
    });

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
                setIsCreatingApplicant(false);
            } else {
                setApplicant(null);
                const confirmCreate = window.confirm("Solicitante no encontrado. ¿Desea registrarlo ahora?");
                if (confirmCreate) {
                    setIsCreatingApplicant(true);
                    setNewApplicantData(prev => ({ ...prev, rut: rutSearch }));
                }
            }
        } catch (error) {
            console.error(error);
            alert("Error al buscar solicitante");
        }
    };

    const handleCreateApplicant = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('solicitantes/', newApplicantData);
            setApplicant(res.data);
            setIsCreatingApplicant(false);
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
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filtrar por Establecimiento</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <select
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                                    value={selectedEst}
                                    onChange={e => setSelectedEst(e.target.value)}
                                >
                                    <option value="">Todos los establecimientos</option>
                                    {establishments.map(est => (
                                        <option key={est.id} value={est.id}>{est.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar llave por nombre..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={keySearchTerm}
                                onChange={e => setKeySearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        </div>

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
                            {!applicant && !isCreatingApplicant ? (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="Ingresar RUT o Nombre"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                                            value={rutSearch}
                                            onChange={e => setRutSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && searchApplicant()}
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    </div>
                                    <button
                                        onClick={searchApplicant}
                                        className="bg-slate-900 text-white px-4 rounded-xl hover:bg-slate-800 font-medium transition-colors"
                                    >
                                        Buscar
                                    </button>
                                </div>
                            ) : isCreatingApplicant ? (
                                <form onSubmit={handleCreateApplicant} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in-up">
                                    <h3 className="text-sm font-bold text-slate-700 mb-2">Nuevo Solicitante</h3>
                                    <input type="text" placeholder="RUT" required value={newApplicantData.rut} onChange={e => setNewApplicantData({ ...newApplicantData, rut: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200" />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Nombre" required value={newApplicantData.nombre} onChange={e => setNewApplicantData({ ...newApplicantData, nombre: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200" />
                                        <input type="text" placeholder="Apellido" required value={newApplicantData.apellido} onChange={e => setNewApplicantData({ ...newApplicantData, apellido: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200" />
                                    </div>
                                    <input type="text" placeholder="Teléfono" value={newApplicantData.telefono} onChange={e => setNewApplicantData({ ...newApplicantData, telefono: e.target.value })} className="w-full p-2 rounded-lg border border-slate-200" />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button type="button" onClick={() => setIsCreatingApplicant(false)} className="text-slate-500 text-sm hover:text-slate-800">Cancelar</button>
                                        <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">Guardar</button>
                                    </div>
                                </form>
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
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Observación (Opcional)</label>
                        <textarea
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="2"
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            placeholder="Notas adicionales..."
                        ></textarea>

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
