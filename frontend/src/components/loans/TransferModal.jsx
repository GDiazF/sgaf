import React, { useState, useEffect } from 'react';
import { X, ArrowRight, UserPlus, Search, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import SearchableSelect from '../common/SearchableSelect';

const TransferModal = ({ isOpen, onClose, loan, onTransferSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [establishments, setEstablishments] = useState([]);
    const [applicants, setApplicants] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);

    const [selectedApplicantId, setSelectedApplicantId] = useState('');
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
    const [selectedDirectorEstId, setSelectedDirectorEstId] = useState('');
    const [observacion, setObservacion] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setSelectedApplicantId('');
            setSelectedFuncionarioId('');
            setSelectedDirectorEstId('');
            setObservacion('');

            const loadLookups = async () => {
                try {
                    const [estRes, appRes, funcRes] = await Promise.all([
                        api.get('establecimientos/?page_size=1000'),
                        api.get('solicitantes/?page_size=1000'),
                        api.get('funcionarios/?page_size=1000')
                    ]);
                    setEstablishments(estRes.data.results || estRes.data || []);
                    setApplicants((appRes.data.results || appRes.data).filter(a => !a.funcionario));
                    setFuncionarios(funcRes.data.results || funcRes.data || []);
                } catch (error) {
                    console.error("Error loading lookups:", error);
                }
            };
            loadLookups();
        }
    }, [isOpen]);

    const handleTransfer = async () => {
        if (!selectedApplicantId && !selectedFuncionarioId && !selectedDirectorEstId) return;

        setLoading(true);
        try {
            const payload = {
                llaves: [loan.llave],
                solicitante: selectedApplicantId || null,
                funcionario: selectedFuncionarioId || null,
                director_establecimiento_id: selectedDirectorEstId || null,
                observacion: observacion || `Traspaso desde ${loan.solicitante_obj?.nombre || 'usuario anterior'}`
            };
            await api.post('prestamos/traspasar/', payload);
            if (onTransferSuccess) onTransferSuccess();
            onClose();
        } catch (error) {
            console.error("Error in transfer:", error);
            alert("Error al realizar el traspaso");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Traspasar Llave</h3>
                                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">Cambiar responsable de la llave</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Current info */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Llave actual</span>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{loan.llave_obj?.nombre}</span>
                            </div>
                            <p className="text-xs text-slate-600">En posesión de: <span className="font-bold text-slate-900">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</span></p>
                        </div>

                        {/* Destination selection */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nueva persona responsable</h4>

                            <div className="space-y-3">
                                <SearchableSelect
                                    label="Personal de SLEP"
                                    placeholder="Buscar funcionario..."
                                    icon={<UserPlus className="w-3 h-3 text-blue-500" />}
                                    options={funcionarios.map(f => ({ value: f.id, label: `${f.nombre_funcionario} (${f.cargo || 'Funcionario'})` }))}
                                    value={selectedFuncionarioId}
                                    onChange={(val) => {
                                        setSelectedFuncionarioId(val);
                                        setSelectedApplicantId('');
                                        setSelectedDirectorEstId('');
                                    }}
                                />

                                <SearchableSelect
                                    label="Externos o Registrados"
                                    placeholder="Buscar por RUT o Nombre..."
                                    icon={<Search className="w-3 h-3 text-indigo-500" />}
                                    options={applicants.map(a => ({ value: a.id, label: `${a.nombre} ${a.apellido} (${a.rut})` }))}
                                    value={selectedApplicantId}
                                    onChange={(val) => {
                                        setSelectedApplicantId(val);
                                        setSelectedFuncionarioId('');
                                        setSelectedDirectorEstId('');
                                    }}
                                />

                                <div className="flex items-center gap-3 py-1">
                                    <div className="h-px bg-slate-100 flex-1"></div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">o</span>
                                    <div className="h-px bg-slate-100 flex-1"></div>
                                </div>

                                <SearchableSelect
                                    label="Dirección de Establecimiento (Director)"
                                    placeholder="Seleccionar escuela..."
                                    icon={<GraduationCap className="w-3 h-3 text-emerald-500" />}
                                    options={establishments.map(e => ({ value: e.id, label: `${e.nombre} (${e.rbd})` }))}
                                    value={selectedDirectorEstId}
                                    onChange={(val) => {
                                        setSelectedDirectorEstId(val);
                                        setSelectedApplicantId('');
                                        setSelectedFuncionarioId('');
                                    }}
                                />
                            </div>

                            <div className="pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">Observación (Opcional)</label>
                                <textarea
                                    value={observacion}
                                    onChange={e => setObservacion(e.target.value)}
                                    placeholder="Motivo del traspaso..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                    rows="2"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleTransfer}
                            disabled={(!selectedApplicantId && !selectedFuncionarioId && !selectedDirectorEstId) || loading}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shadow-xl shadow-slate-900/20"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <ArrowRight className="w-4 h-4" />
                                    <span>Ejecutar Traspaso</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TransferModal;
