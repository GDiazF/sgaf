import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import {
    User, Mail, Shield, Camera, Lock, KeyRound,
    AlertCircle, CheckCircle2, UserCircle2,
    IdCard, Briefcase, Building2, MapPin, BadgeCheck,
    Smartphone, QrCode, ArrowLeft, RefreshCw, XCircle,
    History, Download, Send, UploadCloud, HelpCircle
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, checkUserStatus } = useAuth();

    // UI States
    const [view, setView] = useState('INFO'); // 'INFO', 'PASSWORD', 'ARCO_FORM', 'ARCO_HISTORY'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Password State
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    // ARCO State
    const [arcoHistory, setArcoHistory] = useState([]);
    const [arcoForm, setArcoForm] = useState({
        tipo_derecho: 'RECTIFICACION',
        campo: 'anexo',
        valor_propuesto: '',
        justificacion: '',
        archivo_respaldo: null,
        solicita_bloqueo: false
    });

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView('INFO');
            setError('');
            setSuccess('');
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
            setArcoForm({
                tipo_derecho: 'RECTIFICACION',
                campo: 'anexo',
                valor_propuesto: '',
                justificacion: '',
                archivo_respaldo: null,
                solicita_bloqueo: false
            });
        }
    }, [isOpen]);

    // Fetch ARCO history
    const fetchArcoHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get('arco/');
            setArcoHistory(res.data.results || res.data || []);
        } catch (err) {
            console.error("Error al obtener historial ARCO:", err);
            setError("No se pudo cargar el historial de solicitudes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'ARCO_HISTORY') {
            fetchArcoHistory();
        }
    }, [view]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        setLoading(true);
        setError('');
        try {
            await api.post('auth/avatar/', formData);
            await checkUserStatus();
            setSuccess('Foto de perfil actualizada.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('No se pudo subir la imagen.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async () => {
        setError('');
        if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            await api.post('auth/change-password/', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            setSuccess('Contraseña actualizada correctamente.');
            setView('INFO');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar contraseña.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = () => {
        // Art. 9: Derecho de Portabilidad
        const exportData = {
            usuario: {
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                rol: user.is_superuser ? 'Administrador' : (user.groups?.[0] || 'Usuario')
            },
            funcionario: {
                rut: user.funcionario_data?.rut,
                nombre_completo: user.funcionario_data?.nombre_funcionario,
                cargo: user.funcionario_data?.cargo,
                anexo: user.funcionario_data?.anexo,
                numero_publico: user.funcionario_data?.numero_publico,
                departamento: user.funcionario_data?.departamento,
                unidad: user.funcionario_data?.unidad,
                subdireccion: user.funcionario_data?.subdireccion
            },
            metadata: {
                sistema: "SGAF SLEP Iquique",
                fecha_exportacion: new Date().toISOString(),
                declaracion_ley: "Este archivo contiene sus datos personales exportados en conformidad al Artículo 9° (Derecho de Portabilidad) de la Ley N° 21.719 de Protección de Datos Personales."
            }
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(exportData, null, 4)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `datos_personales_${user.username}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        setSuccess('Datos exportados para portabilidad con éxito.');
        setTimeout(() => setSuccess(''), 5000);
    };

    const handleArcoSubmit = async () => {
        setError('');
        if (!arcoForm.justificacion) {
            setError('Debe especificar una justificación para su solicitud.');
            return;
        }

        const formData = new FormData();
        formData.append('tipo_derecho', arcoForm.tipo_derecho);
        formData.append('justificacion', arcoForm.justificacion);

        if (arcoForm.tipo_derecho === 'RECTIFICACION') {
            if (!arcoForm.campo || !arcoForm.valor_propuesto) {
                setError('Debe especificar el campo y el valor propuesto.');
                return;
            }
            formData.append('campo', arcoForm.campo);
            formData.append('valor_propuesto', arcoForm.valor_propuesto);
        }

        if (arcoForm.archivo_respaldo) {
            formData.append('archivo_respaldo', arcoForm.archivo_respaldo);
        }
        
        formData.append('solicita_bloqueo', arcoForm.solicita_bloqueo);

        setLoading(true);
        try {
            await api.post('arco/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccess('Solicitud ARCO ingresada con éxito. RRHH o TI la revisarán.');
            setView('ARCO_HISTORY');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.campo?.[0] || 'Error al enviar solicitud.');
        } finally {
            setLoading(false);
        }
    };

    const InfoItem = ({ icon: Icon, label, value, colorClass = "text-blue-500", bgClass = "bg-blue-50" }) => (
        <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all group">
            <div className={`p-2 ${bgClass} ${colorClass} rounded-lg`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-[11px] font-bold text-slate-700 truncate">{value || 'No especificado'}</p>
            </div>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Perfil"
            subtitle="Información de cuenta y seguridad"
            icon={UserCircle2}
            maxWidth="max-w-lg"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                {/* Header Profile */}
                <div className="flex items-center gap-4 px-1 pb-4 border-b border-slate-50">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-2xl text-white font-black ring-1 ring-slate-100">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                (user?.funcionario_data?.nombre_funcionario || user?.username)?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 p-1 bg-white text-blue-600 rounded-lg shadow-lg cursor-pointer hover:bg-slate-50 border border-slate-100">
                            <Camera className="w-3 h-3" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={loading} />
                        </label>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                            {user?.funcionario_data?.nombre_funcionario || user?.username}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">@{user?.username}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] uppercase font-black tracking-widest border border-blue-100">
                            {user?.is_superuser ? 'ADMINISTRADOR' : (user?.groups?.[0]?.toUpperCase() || 'USUARIO')}
                        </div>
                    </div>
                </div>

                {/* Feedback */}
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-2xl flex gap-2.5 items-center ${error ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}
                    >
                        {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        <p className="text-xs font-bold">{error || success}</p>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {view === 'INFO' && (
                        <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 px-1">
                            <InfoItem icon={IdCard} label="RUT / RUN" value={user?.funcionario_data?.rut} />
                            <InfoItem icon={Briefcase} label="Cargo" value={user?.funcionario_data?.cargo} colorClass="text-emerald-500" bgClass="bg-emerald-50" />
                            <InfoItem icon={Mail} label="E-MAIL" value={user?.email} />
                            <InfoItem icon={Building2} label="Departamento" value={user?.funcionario_data?.departamento} colorClass="text-purple-500" bgClass="bg-purple-50" />
                            <InfoItem icon={MapPin} label="UNIDAD" value={user?.funcionario_data?.unidad} colorClass="text-orange-500" bgClass="bg-orange-50" />

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    onClick={() => setView('PASSWORD')}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                    Nueva Contraseña
                                </button>
                                <button
                                    onClick={() => setView('ARCO_HISTORY')}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Derechos ARCO
                                </button>
                            </div>

                            <button
                                onClick={handleExportData}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 mt-1"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar Mis Datos (Portabilidad)
                            </button>
                        </motion.div>
                    )}

                    {view === 'PASSWORD' && (
                        <motion.div key="pass" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => setView('INFO')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                <h4 className="font-black text-slate-800 uppercase text-xs">Cambio de Contraseña</h4>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                    placeholder="Contraseña Actual"
                                    value={passwordData.old_password}
                                    onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                        placeholder="Nueva Clave"
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                        placeholder="Repetir Nueva"
                                        value={passwordData.confirm_password}
                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordSubmit}
                                    disabled={loading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Guardar Nueva Clave"}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {view === 'ARCO_HISTORY' && (
                        <motion.div key="arco-hist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setView('INFO')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <h4 className="font-black text-slate-800 uppercase text-xs">Mis Solicitudes ARCO</h4>
                                </div>
                                <button
                                    onClick={() => setView('ARCO_FORM')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Nueva Solicitud
                                </button>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 border-t border-slate-50 pt-2 pr-1">
                                {loading ? (
                                    <div className="py-8 text-center text-xs font-bold text-slate-400">Cargando solicitudes...</div>
                                ) : arcoHistory.length === 0 ? (
                                    <div className="py-8 text-center text-xs font-bold text-slate-400">No has realizado ninguna solicitud ARCO.</div>
                                ) : (
                                    arcoHistory.map((req) => (
                                        <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 text-left">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-bold text-slate-700 uppercase">
                                                    {req.tipo_derecho === 'RECTIFICACION' ? `Rectificar: ${req.campo}` : req.tipo_derecho}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                    req.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                                                    req.estado === 'APROBADA' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {req.estado}
                                                </span>
                                            </div>
                                            {req.tipo_derecho === 'RECTIFICACION' && (
                                                <p className="text-[10px] text-slate-500">
                                                    De <span className="line-through">{req.valor_anterior}</span> a <span className="font-bold">{req.valor_propuesto}</span>
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-500 italic mt-0.5">"{req.justificacion}"</p>
                                            {req.estado === 'RECHAZADA' && req.motivo_rechazo && (
                                                <div className="mt-1 p-2 bg-red-50 text-red-700 rounded-lg text-[9px] font-bold border border-red-100">
                                                    Motivo de rechazo: "{req.motivo_rechazo}"
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {view === 'ARCO_FORM' && (
                        <motion.div key="arco-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => setView('ARCO_HISTORY')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                <h4 className="font-black text-slate-800 uppercase text-xs">Nueva Solicitud ARCO</h4>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tipo de Derecho</label>
                                    <select
                                        className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-xs font-bold text-slate-700"
                                        value={arcoForm.tipo_derecho}
                                        onChange={e => setArcoForm({ ...arcoForm, tipo_derecho: e.target.value, campo: e.target.value === 'RECTIFICACION' ? 'anexo' : '' })}
                                    >
                                        <option value="RECTIFICACION">Rectificación (Modificar un dato)</option>
                                        <option value="SUPRESION">Supresión (Baja de registro del sistema)</option>
                                        <option value="OPOSICION">Oposición (Me opongo a un tratamiento específico)</option>
                                        <option value="PORTABILIDAD">Portabilidad (Copia certificada de datos)</option>
                                    </select>
                                </div>

                                {arcoForm.tipo_derecho === 'RECTIFICACION' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Dato a Rectificar</label>
                                            <select
                                                className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-xs font-bold text-slate-700"
                                                value={arcoForm.campo}
                                                onChange={e => setArcoForm({ ...arcoForm, campo: e.target.value })}
                                            >
                                                <option value="nombre_funcionario">Nombre Completo</option>
                                                <option value="rut">RUT</option>
                                                <option value="anexo">Anexo Telefónico</option>
                                                <option value="cargo">Cargo</option>
                                                <option value="email">Correo Electrónico</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nuevo Valor</label>
                                            <input
                                                type="text"
                                                className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-xs font-bold"
                                                placeholder="Ej: Nuevo anexo, cargo, etc."
                                                value={arcoForm.valor_propuesto}
                                                onChange={e => setArcoForm({ ...arcoForm, valor_propuesto: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Justificación del Requerimiento</label>
                                    <textarea
                                        className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 outline-none transition-all text-xs font-bold h-20 resize-none"
                                        placeholder="Ej: Fui asignado a una nueva oficina / Se corrigió mi apellido..."
                                        value={arcoForm.justificacion}
                                        onChange={e => setArcoForm({ ...arcoForm, justificacion: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Documento de Respaldo (Opcional)</label>
                                    <div className="mt-1 flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-4 transition-all">
                                        <label className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-800">
                                            <UploadCloud className="w-6 h-6 text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                {arcoForm.archivo_respaldo ? arcoForm.archivo_respaldo.name : "Subir PDF o Imagen"}
                                            </span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,application/pdf"
                                                onChange={e => setArcoForm({ ...arcoForm, archivo_respaldo: e.target.files[0] })}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {(arcoForm.tipo_derecho === 'RECTIFICACION' || arcoForm.tipo_derecho === 'SUPRESION' || arcoForm.tipo_derecho === 'OPOSICION') && (
                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={arcoForm.solicita_bloqueo}
                                            onChange={e => setArcoForm({ ...arcoForm, solicita_bloqueo: e.target.checked })}
                                        />
                                        <div className="text-left">
                                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block">Solicitar Bloqueo Temporal (Art. 8° ter)</span>
                                            <span className="text-[8px] text-slate-400 font-bold leading-none block mt-0.5">Suspende el uso de este dato mientras se resuelve su solicitud.</span>
                                        </div>
                                    </label>
                                )}

                                <button
                                    onClick={handleArcoSubmit}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar Solicitud</>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </BaseModal>
    );
};

export default UserProfileModal;
