import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { APP_VERSION } from '../version';
import './LoginResponsive.css';

const fieldLabelClass = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const fieldClass = 'no-global w-full h-10 text-[11px] font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-300';
const iconFieldClass = `${fieldClass} pl-10 pr-3`;
const primaryButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed';
const secondaryButtonClass = 'bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95';
const MotionDiv = motion.div;
const MotionForm = motion.form;

const resolvePublicImageUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;

    const configuredApi = import.meta.env.DEV ? import.meta.env.VITE_API_URL : '/api/';
    try {
        const apiUrl = new URL(configuredApi, window.location.origin);
        const backendOrigin = `${apiUrl.protocol}//${apiUrl.host}`;
        return new URL(path, backendOrigin).toString();
    } catch {
        return new URL(path, window.location.origin).toString();
    }
};

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
    const [loginBackgrounds, setLoginBackgrounds] = useState([]);
    const [backgroundIndex, setBackgroundIndex] = useState(0);
    const [rotationSeconds, setRotationSeconds] = useState(8);

    const { login, verifyMFA, completeLogin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        const fetchBackgrounds = async () => {
            try {
                try {
                    const configRes = await axios.get('/api/personalizacion/login/backgrounds/public-config/');
                    const seconds = Number(configRes.data?.rotation_seconds || 8);
                    if (seconds >= 2 && seconds <= 120) {
                        setRotationSeconds(seconds);
                    }
                } catch {
                    setRotationSeconds(8);
                }

                const res = await axios.get('/api/personalizacion/login/backgrounds/active/');
                const raw = Array.isArray(res.data) ? res.data : [];
                const normalized = raw
                    .map((item) => ({
                        id: item.id,
                        imageUrl: resolvePublicImageUrl(item.imagen),
                        establecimientoNombre: item.establecimiento_nombre || '',
                        establecimientoLogo: resolvePublicImageUrl(item.establecimiento_logo),
                        establecimientoDirector: item.establecimiento_director || '',
                        establecimientoDireccion: item.establecimiento_direccion || '',
                    }))
                    .filter((item) => Boolean(item.imageUrl));

                if (!normalized.length || !mounted) return;

                const preloaded = await Promise.all(
                    normalized.map(
                        (item) =>
                            new Promise((resolve) => {
                                const img = new Image();
                                img.onload = () => resolve(item);
                                img.onerror = () => resolve(null);
                                img.src = item.imageUrl;
                            })
                    )
                );
                if (mounted) {
                    const successful = preloaded.filter(Boolean);
                    setLoginBackgrounds(successful.length ? successful : normalized);
                    setBackgroundIndex(0);
                }
            } catch {
                if (mounted) setLoginBackgrounds([]);
            }
        };
        fetchBackgrounds();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (loginBackgrounds.length < 2) return undefined;
        const timer = setInterval(() => {
            setBackgroundIndex((prev) => (prev + 1) % loginBackgrounds.length);
        }, Math.max(2, Number(rotationSeconds || 8)) * 1000);
        return () => clearInterval(timer);
    }, [loginBackgrounds, rotationSeconds]);

    const activeBackground = useMemo(() => {
        if (!loginBackgrounds.length) return null;
        return loginBackgrounds[backgroundIndex] || null;
    }, [loginBackgrounds, backgroundIndex]);
    const handleEnterSubmit = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
        }
    };

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
                    availableMethods: result.available_methods || ['EMAIL'],
                    setupRequired: false
                });
                setMfaCode('');
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Error during login:', err);
            setError(err.response?.data?.error || 'Credenciales invalidas. Intenta nuevamente.');
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
                    setMfaState((prev) => ({ ...prev, setupRequired: true }));
                    setMfaCode('');
                } catch (setupErr) {
                    console.error('Error al obtener datos de configuracion MFA', setupErr);
                    setError('Codigo correcto, pero hubo un error al cargar el QR. Reintenta.');
                }
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Error en verifyMFA', err);
            setError(err.response?.data?.error || 'Codigo invalido o expirado.');
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

            if (res.data.access) {
                completeLogin(res.data);
                navigate('/');
            } else {
                setError('Configuracion exitosa, por favor ingresa nuevamente.');
                setMfaState((prev) => ({ ...prev, required: false, setupRequired: false }));
            }
        } catch (err) {
            console.error('Error en handleSetupSubmit', err);
            setError(err.response?.data?.error || 'Codigo incorrecto. Verifica el autenticador.');
        } finally {
            setIsLoading(false);
        }
    };

    const resendEmailCode = async () => {
        setResendingEmail(true);
        try {
            await api.post('auth/mfa/send-otp/', { mfa_token: mfaState.token });
            setError('Nuevo codigo enviado a tu correo.');
            setTimeout(() => setError(''), 3000);
        } catch {
            setError('Error al reenviar el codigo.');
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

    const showSuccessNotice = error.toLowerCase().includes('enviado');
    const panelTitle = !mfaState.required
        ? 'Iniciar Sesion'
        : mfaState.setupRequired
            ? 'Configurar Autenticador'
            : 'Verificar Identidad';
    const panelSubtitle = !mfaState.required
        ? 'Ingresa tus credenciales institucionales'
        : mfaState.setupRequired
            ? 'Escanea el codigo QR y valida el codigo de 6 digitos'
            : mfaState.method === 'EMAIL'
                ? `Codigo enviado a ${mfaState.emailMask}`
                : 'Ingresa el codigo generado en tu aplicacion';

    return (
        <div className="login-shell min-h-screen bg-slate-100 relative overflow-hidden flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="absolute inset-0 pointer-events-none">
                {loginBackgrounds.map((item, index) => (
                    <div
                        key={item.id || item.imageUrl}
                        className="absolute inset-0 bg-center bg-cover transition-opacity duration-1000"
                        style={{
                            backgroundImage: `url(${item.imageUrl})`,
                            opacity: index === backgroundIndex ? 1 : 0,
                        }}
                    />
                ))}
                <div className="absolute inset-0 bg-slate-900/35" />
                {!activeBackground && <div className="absolute -top-20 right-[-40px] h-56 w-56 rounded-full bg-white/10 blur-2xl" />}
                {!activeBackground && <div className="absolute bottom-[-40px] left-[-40px] h-48 w-48 rounded-full bg-slate-500/20 blur-2xl" />}
            </div>

            {activeBackground?.establecimientoNombre && (
                <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="establishment-card rounded-2xl border border-white/35 bg-slate-900/75 backdrop-blur-md text-white p-3 sm:p-3.5 shadow-2xl"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden shrink-0">
                            {activeBackground.establecimientoLogo ? (
                                <img
                                    src={activeBackground.establecimientoLogo}
                                    alt={activeBackground.establecimientoNombre}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <ShieldCheck className="w-6 h-6 text-slate-500" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest text-slate-300 font-black">Establecimiento</p>
                            <p className="text-[13px] sm:text-sm leading-tight font-bold text-white break-words">{activeBackground.establecimientoNombre}</p>
                            {activeBackground.establecimientoDirector && (
                                <p className="text-[11px] text-slate-200 mt-1">
                                    Director: {activeBackground.establecimientoDirector}
                                </p>
                            )}
                            {activeBackground.establecimientoDireccion && (
                                <p className="text-[11px] text-slate-300 mt-0.5 break-words">
                                    {activeBackground.establecimientoDireccion}
                                </p>
                            )}
                        </div>
                    </div>
                </MotionDiv>
            )}

            <MotionDiv
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="login-card relative w-full max-w-5xl rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden bg-white"
            >
                <section className="login-left relative bg-slate-900 text-white px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7 lg:px-9 lg:py-8 flex flex-col justify-center gap-5 sm:gap-6">
                    <div className="relative z-10 text-center flex flex-col items-center justify-center">
                        <div className="w-full max-w-[500px] h-32 sm:h-36 md:h-52 rounded-2xl bg-slate-950/65 border border-white/20 shadow-xl shadow-black/30 px-5 md:px-7 py-4 flex items-center justify-center backdrop-blur-sm">
                            <img src="/logo.png" alt="SLEP Iquique" className="w-full h-full object-contain" />
                        </div>

                        <p className="mt-8 text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase text-slate-300">Plataforma Institucional</p>
                        <h1 className="mt-2 text-lg sm:text-xl md:text-[30px] font-bold tracking-tight leading-tight uppercase text-center">Sistema de Gestion Administrativa</h1>
                        <p className="mt-3 text-[11px] sm:text-xs text-slate-200 max-w-md leading-relaxed">
                            Gestiona procesos, solicitudes y servicios desde un unico punto de acceso.
                        </p>

                    </div>

                </section>

                <section className="login-right px-4 py-4 sm:px-5 sm:py-5 md:px-8 md:py-6 flex flex-col bg-white">
                    <div className="mb-5 border-b border-slate-200 pb-4">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase">{panelTitle}</h2>
                        <p className="text-[10px] sm:text-[11px] md:text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {panelSubtitle}
                        </p>
                    </div>

                    <div className="w-full max-w-md mx-auto">
                        <AnimatePresence mode="wait">
                        {!mfaState.required ? (
                            <MotionForm
                                key="login-step"
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                onSubmit={handleLoginSubmit}
                                className="space-y-5"
                            >
                                {error && (
                                    <div className="bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="username" className={fieldLabelClass}>Usuario</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="username"
                                            type="text"
                                            className={iconFieldClass}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onKeyDown={handleEnterSubmit}
                                            placeholder="Ingresa tu usuario"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className={fieldLabelClass}>Contrasena</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            className={`${iconFieldClass} pr-11`}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={handleEnterSubmit}
                                            placeholder="Ingresa tu contrasena"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/forgot-password')}
                                        className="text-[10px] font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                                    >
                                        Olvide mi contrasena
                                    </button>
                                </div>

                                <button type="submit" disabled={isLoading} className={`w-full ${primaryButtonClass}`}>
                                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Iniciar Sesion'}
                                </button>
                            </MotionForm>
                        ) : mfaState.setupRequired ? (
                            <MotionForm
                                key="mfa-setup"
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                onSubmit={handleSetupSubmit}
                                className="space-y-5"
                            >
                                {error && (
                                    <div className="bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="flex justify-center p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                    {setupMfaData?.otpauth_url ? (
                                        <QRCodeCanvas value={setupMfaData.otpauth_url} size={180} />
                                    ) : (
                                        <div className="w-[180px] h-[180px] rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                            <RefreshCw className="w-7 h-7 text-slate-300 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="mfa-setup-code" className={fieldLabelClass}>Codigo de verificacion</label>
                                    <input
                                        id="mfa-setup-code"
                                        type="text"
                                        maxLength={6}
                                        className="no-global w-full h-12 text-center text-xl font-black tracking-[0.45em] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                        placeholder="000000"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={handleEnterSubmit}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <input
                                        type="checkbox"
                                        className="no-global w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={rememberDevice}
                                        onChange={(e) => setRememberDevice(e.target.checked)}
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recordar equipo por 30 dias</span>
                                </label>

                                <button type="submit" disabled={isLoading || mfaCode.length < 6} className={`w-full ${primaryButtonClass}`}>
                                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Finalizar Configuracion'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMfaState((prev) => ({ ...prev, setupRequired: false }))}
                                    className={`w-full ${secondaryButtonClass}`}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver al codigo por correo
                                </button>
                            </MotionForm>
                        ) : (
                            <MotionForm
                                key="mfa-step"
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                onSubmit={handleMfaSubmit}
                                className="space-y-5"
                            >
                                {error && (
                                    <div className={`${showSuccessNotice ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'} text-[10px] font-bold uppercase p-3 rounded-xl border flex gap-2 items-center`}>
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="mfa-code" className={fieldLabelClass}>Codigo de verificacion</label>
                                    <input
                                        id="mfa-code"
                                        type="text"
                                        maxLength={6}
                                        className="no-global w-full h-12 text-center text-xl font-black tracking-[0.45em] bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                        placeholder="000000"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={handleEnterSubmit}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <input
                                        type="checkbox"
                                        className="no-global w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={rememberDevice}
                                        onChange={(e) => setRememberDevice(e.target.checked)}
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recordar equipo por 30 dias</span>
                                </label>

                                <button type="submit" disabled={isLoading || mfaCode.length < 6} className={`w-full ${primaryButtonClass}`}>
                                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verificar e Ingresar'}
                                </button>

                                {mfaState.availableMethods.length > 1 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Metodo de verificacion</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {mfaState.availableMethods.map((method) => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => switchMfaMethod(method)}
                                                    className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${mfaState.method === method ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
                                                >
                                                    {method === 'EMAIL' ? 'Usar Correo' : 'Usar App'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-2">
                                    {mfaState.method === 'EMAIL' && (
                                        <button
                                            type="button"
                                            disabled={resendingEmail}
                                            onClick={resendEmailCode}
                                            className="text-[10px] font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors py-2 disabled:opacity-60"
                                        >
                                            {resendingEmail ? 'Enviando...' : 'No recibiste el codigo? Reenviar'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMfaCode('');
                                            setMfaState((prev) => ({ ...prev, required: false }));
                                        }}
                                        className={`w-full ${secondaryButtonClass}`}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Volver al login
                                    </button>
                                </div>
                            </MotionForm>
                        )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                            (c) 2026 SLEP Iquique. Todos los derechos reservados.
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-1">
                            Version {APP_VERSION}
                        </p>
                    </div>

                </section>
            </MotionDiv>
        </div>
    );
};

export default Login;

