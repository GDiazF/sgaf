import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Mail, Server, Shield, Save, RefreshCw,
    CheckCircle2, AlertCircle, Eye, EyeOff, Send,
    Settings2, Plus, Trash2, Code2, 
    Smartphone, Monitor, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const EmailSettings = () => {
    const [activeTab, setActiveTab] = useState('accounts');
    const [accounts, setAccounts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [globalConfig, setGlobalConfig] = useState({ reservas_admin_email: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountFormData, setAccountFormData] = useState({
        nombre: '', smtp_host: '', smtp_port: 587, smtp_user: '', 
        smtp_password: '', smtp_use_tls: true, smtp_use_ssl: false,
        remitente_nombre: 'SGAF', remitente_email: '', es_default: false
    });

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewMode, setPreviewMode] = useState('desktop');
    const [previewTheme, setPreviewTheme] = useState('light'); // light or dark
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [isTestingConn, setIsTestingConn] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [accRes, tempRes] = await Promise.all([
                api.get('comunicaciones/cuentas-smtp/'),
                api.get('comunicaciones/plantillas/')
            ]);
            setAccounts(accRes.data.results || accRes.data);
            setTemplates(tempRes.data.results || tempRes.data);
            if (tempRes.data.length > 0) handleSelectTemplate(tempRes.data[0]);

            // Intentar cargar config global por separado para no bloquear el resto
            try {
                const configRes = await api.get('admin/email/config/');
                setGlobalConfig(configRes.data);
            } catch (e) {
                console.log("Config global no disponible aún");
            }
        } catch (error) { 
            showStatus('error', 'Error al cargar datos del servidor.'); 
        } finally { 
            setLoading(false); 
        }
    };

    const showStatus = (type, message) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 4000);
    };

    const getVariables = (purpose) => {
        if (!purpose) return [];
        const common = ['{{ nombre }}', '{{ year }}'];
        if (purpose === 'MFA') return [...common, '{{ codigo }}'];
        if (purpose === 'RESET_PASSWORD') return [...common, '{{ reset_url }}'];
        if (purpose.startsWith('RESERVA')) return [...common, '{{ recurso }}', '{{ fecha }}', '{{ hora }}', '{{ estado }}', '{{ codigo_reserva }}'];
        return common;
    };

    const handleSelectTemplate = async (template) => {
        setSelectedTemplate(template);
        updatePreview(template.cuerpo_html);
    };

    const updatePreview = async (html) => {
        try {
            const res = await api.post('comunicaciones/plantillas/preview/', { html });
            setPreviewHtml(res.data.html);
        } catch (error) {}
    };

    const handleTemplateChange = (field, value) => {
        const updated = { ...selectedTemplate, [field]: value };
        setSelectedTemplate(updated);
        if (field === 'cuerpo_html') updatePreview(value);
    };

    const saveTemplate = async () => {
        setSaving(true);
        try {
            await api.patch(`comunicaciones/plantillas/${selectedTemplate.id}/`, selectedTemplate);
            showStatus('success', 'Guardado con éxito.');
            fetchData();
        } catch (error) { showStatus('error', 'Fallo al guardar.'); }
        finally { setSaving(false); }
    };

    const sendTestMail = async () => {
        if (!testEmail) return alert('Ingresa un correo');
        setSendingTest(true);
        try {
            await api.post(`comunicaciones/plantillas/${selectedTemplate.id}/send_test/`, { email: testEmail });
            showStatus('success', 'Correo de prueba enviado.');
        } catch (error) { showStatus('error', 'Error al enviar.'); }
        finally { setSendingTest(false); }
    };

    const handleSaveGlobalConfig = async () => {
        setSaving(true);
        try {
            await api.post('comunicaciones/configuracion/', globalConfig);
            showStatus('success', 'Configuración actualizada.');
        } catch (error) { showStatus('error', 'Error al guardar.'); }
        finally { setSaving(false); }
    };

    const handleOpenAccountModal = (acc = null) => {
        if (acc) {
            setEditingAccount(acc);
            setAccountFormData({ ...acc, smtp_password: '' });
        } else {
            setEditingAccount(null);
            setAccountFormData({
                nombre: '', smtp_host: '', smtp_port: 587, smtp_user: '', 
                smtp_password: '', smtp_use_tls: true, smtp_use_ssl: false,
                remitente_nombre: 'SGAF', remitente_email: '', es_default: accounts.length === 0
            });
        }
        setIsAccountModalOpen(true);
    };

    const handleSaveAccount = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...accountFormData };
            if (!data.smtp_password && editingAccount) delete data.smtp_password;
            if (editingAccount) await api.patch(`comunicaciones/cuentas-smtp/${editingAccount.id}/`, data);
            else await api.post('comunicaciones/cuentas-smtp/', data);
            setIsAccountModalOpen(false);
            fetchData();
        } catch (error) { showStatus('error', 'Error al guardar cuenta.'); }
        finally { setSaving(false); }
    };

    const testConnection = async (id) => {
        setIsTestingConn(id);
        try {
            await api.post(`comunicaciones/cuentas-smtp/${id}/test_connection/`);
            showStatus('success', 'Conexión Exitosa.');
        } catch (error) { showStatus('error', 'Fallo de conexión.'); }
        finally { setIsTestingConn(null); }
    };

    if (loading) return <div className="h-full w-full flex items-center justify-center bg-white"><RefreshCw className="animate-spin text-slate-300" /></div>;

    return (
        <div className="fixed inset-0 top-[64px] left-0 md:left-[260px] bg-[#f8fafc] flex flex-col overflow-hidden text-slate-800 p-8">
            {/* Custom Styles for Scrollbars and Forced Dark Inputs */}
            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .dark-scroll::-webkit-scrollbar-track { background: #1e1e1e; }
                .dark-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
                .forced-dark:focus { background-color: transparent !important; color: white !important; }
            `}</style>

            {/* 1. Header Section */}
            <div className="mb-6 shrink-0">
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 mb-4">Comunicaciones y Notificaciones</h1>
                
                <div className="flex border border-slate-200 rounded-xl w-fit p-1 bg-white shadow-sm">
                    <button onClick={() => setActiveTab('accounts')} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'accounts' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Cuentas</button>
                    <button onClick={() => setActiveTab('templates')} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Editor</button>
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                {activeTab === 'templates' ? (
                    <>
                        {/* Column 1: Sidebar Templates */}
                        <div className="w-64 flex flex-col border border-slate-200 rounded-2xl overflow-hidden shrink-0 bg-white shadow-sm">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Tipo de Notificación</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                                {templates.map(temp => (
                                    <button key={temp.id} onClick={() => handleSelectTemplate(temp)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedTemplate?.id === temp.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                                        <p className="text-[10px] font-bold uppercase truncate">{temp.nombre}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Editor Center */}
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3 px-3 h-10 border border-slate-200 rounded-xl bg-white shadow-sm w-fit">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Salida:</span>
                                    <select className="bg-transparent text-[10px] font-black border-none p-0 focus:ring-0 cursor-pointer min-w-[80px]" 
                                        value={selectedTemplate?.cuenta_smtp || ''} 
                                        onChange={e => handleTemplateChange('cuenta_smtp', e.target.value)}>
                                        <option value="">(Global)</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                    </select>
                                </div>
                                <button onClick={saveTemplate} disabled={saving} className="h-10 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={14}/>} Guardar
                                </button>
                                <button onClick={sendTestMail} disabled={sendingTest} className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                                    <Send size={14}/> Probar
                                </button>
                            </div>

                            {/* Editor Area */}
                            <div className="flex-1 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-[#1e1e1e] shadow-2xl">
                                <div className="p-4 bg-[#252526] border-b border-white/5 flex justify-between items-center shrink-0">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Editor.html</span>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase italic mr-2">Variables Disponibles:</span>
                                        {getVariables(selectedTemplate?.proposito).map(v => (
                                            <button key={v} onClick={() => {
                                                const textarea = document.getElementById('code-editor');
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;
                                                const text = selectedTemplate.cuerpo_html;
                                                const newText = text.substring(0, start) + v + text.substring(end);
                                                handleTemplateChange('cuerpo_html', newText);
                                            }} className="text-[9px] font-black text-blue-400 hover:text-white transition-colors">{v}</button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    id="code-editor"
                                    className="flex-1 w-full p-8 bg-[#1e1e1e] !bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[11px] leading-relaxed resize-none outline-none overflow-y-auto dark-scroll forced-dark focus:!bg-[#1e1e1e]"
                                    value={selectedTemplate?.cuerpo_html || ''}
                                    spellCheck="false"
                                    onChange={(e) => handleTemplateChange('cuerpo_html', e.target.value)}
                                />
                                <div className="p-4 border-t border-white/5 bg-[#252526] shrink-0">
                                    <div className="flex items-center gap-4 px-4 py-2 border border-white/10 rounded-xl focus-within:border-blue-500/50">
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic">Asunto:</span>
                                        <input className="flex-1 bg-transparent text-white font-bold text-xs outline-none forced-dark focus:!bg-transparent" value={selectedTemplate?.asunto || ''} onChange={e => handleTemplateChange('asunto', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Preview Right */}
                        <div className="w-[550px] flex flex-col border border-slate-200 rounded-2xl overflow-hidden shrink-0 bg-white shadow-sm">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vista Previa Real</span>
                                <div className="flex gap-1 border border-slate-200 bg-white p-0.5 rounded-lg">
                                    <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Smartphone size={14}/></button>
                                    <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}><Monitor size={14}/></button>
                                </div>
                            </div>
                                <div className={`flex-1 p-8 overflow-hidden flex justify-center items-start transition-all duration-300 ${previewTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50/50'}`}>
                                    <div className={`shadow-2xl rounded-xl overflow-hidden border border-slate-200 transition-all duration-300 ${previewMode === 'mobile' ? 'w-[320px] h-full' : 'w-full h-full'}`}>
                                        <iframe srcDoc={previewHtml} className="w-full h-full border-none" title="preview" />
                                    </div>
                                </div>
                            <div className="p-4 border-t border-slate-200">
                                <input type="email" placeholder="test@email.com" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-slate-50 focus:border-blue-500" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                            </div>
                        </div>
                    </>
                ) : (
                    /* Accounts View - Balanced Grid */
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cuentas SMTP de Salida</h3>
                            <button onClick={() => handleOpenAccountModal()} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Nueva Cuenta</button>
                        </div>
                        
                        {/* Configuración Global */}
                        <div className="bg-slate-100/50 rounded-2xl p-6 border border-slate-200">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Settings2 size={12}/> Configuración Global
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">NOTIFICACIONES RESERVAS (ADMIN)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="admin@ejemplo.cl, soporte@ejemplo.cl"
                                            className="w-full max-w-lg bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-blue-500"
                                            value={globalConfig.reservas_admin_email}
                                            onChange={e => setGlobalConfig({...globalConfig, reservas_admin_email: e.target.value})}
                                        />
                                        <button onClick={handleSaveGlobalConfig} className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-[10px] font-bold">
                                            {saving ? <RefreshCw size={12} className="animate-spin"/> : <Save size={12}/>} Guardar
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">Correos de notificación para alertas de reservas (separados por coma).</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scroll pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 items-start">
                            {accounts.map(acc => (
                                <div key={acc.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-400 transition-all flex flex-col gap-6 relative group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${acc.es_default ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                                                <Server size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{acc.nombre}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 lowercase truncate max-w-[120px]">{acc.smtp_user}</p>
                                            </div>
                                        </div>
                                        {acc.es_default && <span className="text-[7px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Principal</span>}
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-slate-50 mt-auto">
                                        <button onClick={() => testConnection(acc.id)} className="flex-1 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-500 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                                            {isTestingConn === acc.id ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} Test
                                        </button>
                                        <button onClick={() => handleOpenAccountModal(acc)} className="p-2 border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Settings2 size={16}/></button>
                                        {!acc.es_default && <button className="p-2 border border-slate-100 rounded-lg text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Account using Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isAccountModalOpen && (
                        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                                <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                                    <h3 className="font-black text-xs uppercase tracking-widest">Configuración SMTP</h3>
                                    <button onClick={() => setIsAccountModalOpen(false)}><X size={24}/></button>
                                </div>
                                <form onSubmit={handleSaveAccount} className="p-10 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Descriptivo</label>
                                            <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" value={accountFormData.nombre} onChange={e => setAccountFormData({...accountFormData, nombre: e.target.value})} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Host SMTP</label>
                                            <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.smtp_host} onChange={e => setAccountFormData({...accountFormData, smtp_host: e.target.value})} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Puerto</label>
                                            <input required type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.smtp_port} onChange={e => setAccountFormData({...accountFormData, smtp_port: e.target.value})} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario / Email Acceso</label>
                                            <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.smtp_user} onChange={e => {
                                                const val = e.target.value;
                                                setAccountFormData({
                                                    ...accountFormData, 
                                                    smtp_user: val,
                                                    remitente_email: accountFormData.remitente_email || val // Sugerir el mismo email
                                                });
                                            }} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                                            <div className="relative">
                                                <input type={showPassword ? "text" : "password"} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.smtp_password} onChange={e => setAccountFormData({...accountFormData, smtp_password: e.target.value})} />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                            </div>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Remitente (Ej: SGAF)</label>
                                            <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.remitente_nombre} onChange={e => setAccountFormData({...accountFormData, remitente_nombre: e.target.value})} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Remitente</label>
                                            <input required type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" value={accountFormData.remitente_email} onChange={e => setAccountFormData({...accountFormData, remitente_email: e.target.value})} />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">Guardar Configuración</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Notification Toast */}
            <AnimatePresence>
                {status && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`fixed bottom-8 right-8 z-[1000] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 bg-slate-900 text-white`}>
                        {status.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
                        <span className="text-[11px] font-black uppercase tracking-widest">{status.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmailSettings;
