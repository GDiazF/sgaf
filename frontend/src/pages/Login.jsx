import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { QRCodeCanvas } from 'qrcode.react';
import { APP_VERSION } from '../version';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);
    const [mfaState, setMfaState] = useState({ required: false, method: null, emailMask: '', token: null, availableMethods: [], setupRequired: false });
    const [setupMfaData, setSetupMfaData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resendingEmail, setResendingEmail] = useState(false);

    const { login, verifyMFA, completeLogin, logout } = useAuth();
    const navigate = useNavigate();

    // Limpiar cualquier sesión previa al entrar al login para evitar conflictos de cookies
    React.useEffect(() => {
        logout();
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await login(username, password);
            if (result?.mfa_required) {
                setMfaState({
                    required: true,
                    method: result.mfa_method,
                    emailMask: result.email_mask,
                    token: result.mfa_token,
                    availableMethods: result.available_methods || ['EMAIL']
                });
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError(err.response?.data?.error || 'Credenciales inválidas. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMfaSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await verifyMFA(mfaState.token, mfaCode, rememberDevice, mfaState.method);

            if (res?.mfa_setup_required) {
                try {
                    const setupRes = await api.get(`auth/mfa/setup/?mfa_token=${mfaState.token}`);
                    setSetupMfaData(setupRes.data);
                    setMfaState(prev => ({ ...prev, setupRequired: true }));
                    setMfaCode('');
                } catch (setupErr) {
                    console.error("Error al obtener datos de configuración MFA", setupErr);
                    setError("El código fue correcto, pero hubo un error al cargar el QR. Por favor reintente.");
                }
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error("Error en verifyMFA", err);
            setError(err.response?.data?.error || 'Código inválido o expirado.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post('auth/mfa/setup/', {
                mfa_token: mfaState.token,
                code: mfaCode,
                method: 'TOTP',
                remember_device: rememberDevice
            });

            // Si el setup fue exitoso, el backend nos devuelve los tokens finales
            if (res.data.access) {
                completeLogin(res.data);
                navigate('/');
            } else {
                setError("Configuración exitosa, por favor ingresa nuevamente.");
                setMfaState({ ...mfaState, required: false, setupRequired: false });
            }
        } catch (err) {
            console.error("Error en handleSetupSubmit", err);
            setError(err.response?.data?.error || 'Código incorrecto. Verifica el autenticador.');
        } finally {
            setIsLoading(false);
        }
    };

    const resendEmailCode = async () => {
        setResendingEmail(true);
        try {
            await api.post('auth/mfa/send-otp/', { mfa_token: mfaState.token });
            setError('Nuevo código enviado a tu correo.');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            setError('Error al reenviar el código.');
        } finally {
            setResendingEmail(false);
        }
    };

    const switchMfaMethod = async (newMethod) => {
        if (newMethod === 'EMAIL') {
            await resendEmailCode();
        }
        setMfaState({ ...mfaState, method: newMethod });
        setMfaCode('');
    };


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
                {/* Decorative header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Modified for wide logo */}
                        <div className="mb-6 p-2 w-72 h-36 flex items-center justify-center bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                            <img src="/logo.png" alt="SLEP Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">
                            {mfaState.required ? "Seguridad" : "Bienvenido"}
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sistema de Gestión SLEP Iquique</p>
                    </motion.div>
                </div>

                <div className="p-8 pt-10">
                    <AnimatePresence mode="wait">
                        {!mfaState.required ? (
                            <motion.form
                                key="login-step"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleLoginSubmit}
                                className="space-y-6"
                            >
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="relative">
                                    <input
                                        type="text"
                                        id="username"
                                        className="peer w-full !pl-12 !pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl !focus:border-slate-900 !focus:ring-[6px] !focus:ring-slate-900/5 outline-none transition-all placeholder:text-transparent text-slate-900 font-bold text-sm"
                                        placeholder=" "
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                    <label
                                        htmlFor="username"
                                        className="absolute !left-12 -top-2 bg-white px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all 
                                        peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-bold
                                        peer-focus:-top-2 peer-focus:text-[8px] peer-focus:text-slate-900 peer-focus:bg-white pointer-events-none"
                                    >
                                        Usuario
                                    </label>
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 peer-focus:text-slate-900 transition-colors pointer-events-none" />
                                </div>

                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        className="peer w-full !pl-12 !pr-12 py-3 bg-white border-2 border-slate-100 rounded-xl !focus:border-slate-900 !focus:ring-[6px] !focus:ring-slate-900/5 outline-none transition-all placeholder:text-transparent text-slate-900 font-bold text-sm"
                                        placeholder=" "
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <label
                                        htmlFor="password"
                                        className="absolute !left-12 -top-2 bg-white px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all 
                                        peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-bold
                                        peer-focus:-top-2 peer-focus:text-[8px] peer-focus:text-slate-900 peer-focus:bg-white pointer-events-none"
                                    >
                                        Contraseña
                                    </label>
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 peer-focus:text-slate-900 transition-colors pointer-events-none" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors outline-none"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/forgot-password')}
                                        className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-xl shadow-slate-900/10 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center mt-2 uppercase text-[11px] tracking-widest"
                                >
                                    {isLoading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        "Iniciar Sesión"
                                    )}
                                </button>
                            </motion.form>
                        ) : mfaState.setupRequired ? (
                            <motion.form
                                key="mfa-setup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSetupSubmit}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase">Configurar Autenticador</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escanea el código con tu App (Google Authenticator, etc)</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold border border-red-100 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-center p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-inner group">
                                    {setupMfaData?.otpauth_url ? (
                                        <div className="relative">
                                            <QRCodeCanvas value={setupMfaData.otpauth_url} size={180} />
                                            <div className="absolute inset-0 border-4 border-white/50 rounded-lg pointer-events-none"></div>
                                        </div>
                                    ) : (
                                        <div className="w-[180px] h-[180px] bg-slate-50 animate-pulse rounded-lg flex items-center justify-center">
                                            <RefreshCw className="w-8 h-8 text-slate-200 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest">Luego ingresa el código de 6 dígitos generado:</p>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            className="w-full text-center py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition-all text-2xl font-black text-slate-900 tracking-[0.5em] placeholder:text-slate-200"
                                            placeholder="000000"
                                            value={mfaCode}
                                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer group hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-md border-2 border-slate-200 group-hover:border-slate-900 bg-white transition-all">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={rememberDevice}
                                                onChange={(e) => setRememberDevice(e.target.checked)}
                                            />
                                            {rememberDevice && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-slate-900">Recordar equipo por 30 días</span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || mfaCode.length < 6}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center uppercase text-[11px] tracking-widest"
                                >
                                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Finalizar Configuración"}
                                </button>

                                <div className="flex flex-col gap-2 pt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setMfaState(prev => ({ ...prev, setupRequired: false }))}
                                        className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all p-2 flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-3 h-3" /> Volver al Correo
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="mfa-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleMfaSubmit}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2 mb-2">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm shadow-blue-500/10">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Doble Factor</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                        {mfaState.method === 'EMAIL'
                                            ? `Código enviado a ${mfaState.emailMask}`
                                            : "Ingresa el código de tu App"}
                                    </p>
                                </div>

                                {error && (
                                    <div className={`p-3 rounded-xl text-[11px] font-bold border flex items-center gap-2 ${error.includes('enviado') ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        className="w-full text-center py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition-all text-2xl font-black text-slate-900 tracking-[0.5em] placeholder:text-slate-200"
                                        placeholder="000000"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer group hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-md border-2 border-slate-200 group-hover:border-slate-900 bg-white transition-all">
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={rememberDevice}
                                            onChange={(e) => setRememberDevice(e.target.checked)}
                                        />
                                        {rememberDevice && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-slate-900">Recordar equipo por 30 días</span>
                                </label>

                                <div className="space-y-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading || mfaCode.length < (mfaState.method === 'EMAIL' ? 6 : 6)}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center uppercase text-[11px] tracking-widest"
                                    >
                                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Verificar e Ingresar"}
                                    </button>

                                    {/* Method Selector if available */}
                                    {mfaState.availableMethods.length > 1 && (
                                        <div className="flex flex-col gap-2 pt-1">
                                            <p className="text-[8px] font-black text-slate-300 uppercase text-center tracking-widest">Otras opciones de verificación</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {mfaState.availableMethods.map(m => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => switchMfaMethod(m)}
                                                        className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${mfaState.method === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                                                    >
                                                        {m === 'EMAIL' ? 'Usar Correo' : 'Usar App'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2 pt-2">
                                        {mfaState.method === 'EMAIL' && (
                                            <button
                                                type="button"
                                                disabled={resendingEmail}
                                                onClick={resendEmailCode}
                                                className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all p-2"
                                            >
                                                {resendingEmail ? "Enviando..." : "¿No recibiste el código? Reenviar"}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMfaCode('');
                                                setMfaState({ ...mfaState, required: false });
                                            }}
                                            className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all p-2 flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-3 h-3" /> Volver
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>

                <div className="bg-slate-50 p-6 text-center border-t border-slate-100 flex flex-col gap-1">
                    <p className="text-xs text-slate-400 font-medium">© 2026 SLEP Iquique. Todos los derechos reservados.</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Versión {APP_VERSION}</p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
