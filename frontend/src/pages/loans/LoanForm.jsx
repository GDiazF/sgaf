import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Save, Search, Plus, X, Key, UserPlus, Check, Building, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ApplicantModal from '../../components/applicants/ApplicantModal';
import FormInput from '../../components/common/FormInput';
import MultiSearchableSelect from '../../components/common/MultiSearchableSelect';
import SearchableSelect from '../../components/common/SearchableSelect';

const LoanForm = () => {
    const navigate = useNavigate();

    // Key Selection State
    const [establishments, setEstablishments] = useState([]);
    const [selectedEsts, setSelectedEsts] = useState([]); // Multiple
    const [keySearchTerm, setKeySearchTerm] = useState('');
    const [foundKeys, setFoundKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);

    // Applicant Selection State
    const [applicants, setApplicants] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [selectedApplicantId, setSelectedApplicantId] = useState('');
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [showApplicantForm, setShowApplicantForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const [observacion, setObservacion] = useState('');

    useEffect(() => {
        // Initial load of Lookups
        const loadLookups = async () => {
            try {
                const [estRes, appRes, funcRes] = await Promise.all([
                    api.get('establecimientos/?page_size=1000'),
                    api.get('solicitantes/?page_size=1000'),
                    api.get('funcionarios/?page_size=1000')
                ]);
                setEstablishments(estRes.data.results || estRes.data);
                setApplicants(appRes.data.results || appRes.data);
                setFuncionarios(funcRes.data.results || funcRes.data || []);
            } catch (error) {
                console.error("Error loading lookups:", error);
            }
        };
        loadLookups();
    }, []);

    // Search keys when term changes or establishment changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            let query = 'llaves/?';
            if (selectedEsts.length > 0) {
                query += `establecimiento__in=${selectedEsts.join(',')}&`;
            }
            if (keySearchTerm.length > 0) {
                query += `search=${keySearchTerm}`;
            }

            // Only search if we have at least one establishment selected OR a search term > 1 char
            if (selectedEsts.length > 0 || keySearchTerm.length > 1) {
                api.get(query)
                    .then(res => setFoundKeys(res.data.results || res.data || []))
                    .catch(console.error);
            } else {
                setFoundKeys([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [keySearchTerm, selectedEsts]);

    const handleAddKey = (key) => {
        if (!selectedKeys.find(k => k.id === key.id)) {
            setSelectedKeys([...selectedKeys, key]);
        }
    };

    const handleRemoveKey = (id) => {
        setSelectedKeys(selectedKeys.filter(k => k.id !== id));
    };

    const handleSaveApplicant = async (data) => {
        try {
            const res = await api.post('solicitantes/', data);
            setApplicants([...applicants, res.data]);
            setSelectedApplicantId(res.data.id);
            setSelectedFuncionarioId('');
            setShowApplicantForm(false);
        } catch (error) {
            console.error(error);
            alert("Error al crear solicitante. Verifique los datos.");
        }
    };

    const handleFuncionarioSelect = (id) => {
        setSelectedFuncionarioId(id);
        setSelectedApplicantId('');
    };

    const handleApplicantSelect = (id) => {
        setSelectedApplicantId(id);
        setSelectedFuncionarioId('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedKeys.length === 0) {
            alert("Debe seleccionar al menos una llave");
            return;
        }
        if (!selectedApplicantId && !selectedFuncionarioId) {
            alert("Debe seleccionar un solicitante");
            return;
        }

        setLoading(true);
        const payload = {
            solicitante: selectedApplicantId || null,
            funcionario: selectedFuncionarioId || null,
            llaves: selectedKeys.map(k => k.id),
            observacion: observacion
        };

        try {
            await api.post('prestamos/', payload);
            navigate('/loans'); // Redirect to loans panel
        } catch (error) {
            console.error("Error creating loan:", error);
            alert("Error al crear el préstamo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 pb-10 w-full">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/loans')}
                        className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-tight">Nuevo Préstamo</h1>
                        <p className="text-[11px] text-slate-500">Registre la entrega de llaves a funcionarios o externos.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* LEFT SIDE: Selection Step 1 */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 relative z-[20] h-full flex flex-col overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm">
                                    <Key className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">1. Seleccionar Llaves</h2>
                                </div>
                            </div>
                            {selectedKeys.length > 0 && (
                                <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {selectedKeys.length} SELECCIONADAS
                                </span>
                            )}
                        </div>

                        <div className="p-4 space-y-3 flex flex-col flex-1 overflow-hidden">
                            {/* Multiselect Est */}
                            <MultiSearchableSelect
                                label="Establecimientos"
                                icon={Building}
                                placeholder="Filtrar por establecimientos..."
                                options={establishments.map(est => ({ value: est.id, label: est.nombre }))}
                                value={selectedEsts}
                                onChange={setSelectedEsts}
                                className="shrink-0"
                            />

                            <FormInput
                                placeholder="Buscar llave por nombre o código..."
                                icon={Search}
                                value={keySearchTerm}
                                onChange={e => setKeySearchTerm(e.target.value)}
                                className="shrink-0"
                            />

                            {/* Found Keys Grid/List */}
                            <div className="flex-1 flex flex-col min-h-[300px] mt-1">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-y-auto custom-scrollbar">
                                    {foundKeys.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                            <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p className="font-medium text-[12px]">
                                                {selectedEsts.length > 0 || keySearchTerm ? 'No se encontraron llaves' : 'Filtre para comenzar'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-150">
                                            {foundKeys.map(k => (
                                                <button
                                                    key={k.id}
                                                    type="button"
                                                    onClick={() => k.disponible && handleAddKey(k)}
                                                    disabled={!k.disponible}
                                                    className={`w-full text-left p-3 flex justify-between items-center group transition-all ${!k.disponible ? 'opacity-40 grayscale pointer-events-none' : 'hover:bg-indigo-50/50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedKeys.find(s => s.id === k.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                            {selectedKeys.find(s => s.id === k.id) ? <Check className="w-4 h-4 stroke-[3px]" /> : <Key className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-[12px]">{k.nombre}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{k.establecimiento_nombre}</p>
                                                        </div>
                                                    </div>
                                                    {!k.disponible && (
                                                        <span className="text-[8px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">Ocupada</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Applicant Step 2 */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Applicant Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 relative z-[30] shrink-0">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-t-3xl overflow-hidden shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
                                    <UserPlus className="w-4 h-4" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-900">2. Solicitante</h2>
                            </div>
                            <button
                                onClick={() => setShowApplicantForm(true)}
                                className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                NUEVO
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <ApplicantModal
                                isOpen={showApplicantForm}
                                onClose={() => setShowApplicantForm(false)}
                                onSave={handleSaveApplicant}
                            />

                            <div className="space-y-3">
                                <SearchableSelect
                                    label="Personal de SLEP"
                                    placeholder="Buscar funcionario..."
                                    icon={<UserPlus className="w-3 h-3 text-blue-500" />}
                                    options={funcionarios.map(f => ({ value: f.id, label: `${f.nombre_funcionario} (${f.cargo || 'Funcionario'})` }))}
                                    value={selectedFuncionarioId}
                                    onChange={handleFuncionarioSelect}
                                />

                                <div className="flex items-center gap-3 py-1">
                                    <div className="h-px bg-slate-100 flex-1"></div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">o</span>
                                    <div className="h-px bg-slate-100 flex-1"></div>
                                </div>

                                <SearchableSelect
                                    label="Externos o Registrados"
                                    placeholder="Buscar por RUT o Nombre..."
                                    icon={<Search className="w-3 h-3 text-indigo-500" />}
                                    options={applicants.map(a => ({ value: a.id, label: `${a.nombre} ${a.apellido} (${a.rut})` }))}
                                    value={selectedApplicantId}
                                    onChange={handleApplicantSelect}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Finalize Card */}
                    <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group flex-1">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2.5 mb-4 shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <Save className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h3 className="text-sm font-bold">Resumen y Registro</h3>
                            </div>

                            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                                <FormInput
                                    placeholder="Observaciones..."
                                    value={observacion}
                                    onChange={e => setObservacion(e.target.value)}
                                    multiline
                                    rows="2"
                                    inputClassName="!bg-slate-800 !border-slate-700 !text-white !placeholder-slate-500 rounded-xl text-xs"
                                    className="shrink-0"
                                />

                                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col flex-1 overflow-hidden min-h-[120px]">
                                    <div className="flex justify-between text-[10px] mb-2 shrink-0">
                                        <span className="text-slate-400 uppercase tracking-widest font-black">Seleccionadas</span>
                                        <span className="text-indigo-400 font-black">{selectedKeys.length}</span>
                                    </div>
                                    <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar-dark pr-1">
                                        <AnimatePresence>
                                            {selectedKeys.map(k => (
                                                <motion.div
                                                    key={k.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="flex items-center justify-between gap-2 text-[10px] bg-slate-800/80 p-2 rounded-xl border border-slate-700/30"
                                                >
                                                    <span className="font-bold text-slate-200 truncate">{k.nombre}</span>
                                                    <button onClick={() => handleRemoveKey(k.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        {selectedKeys.length === 0 && (
                                            <p className="text-slate-500 italic text-center text-[10px] py-4">Ninguna seleccionada</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={(!selectedApplicantId && !selectedFuncionarioId) || selectedKeys.length === 0 || loading}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-blue-900/30 transition-all font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shrink-0 mt-auto"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Registrar Préstamo</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanForm;
